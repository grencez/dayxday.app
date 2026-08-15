import { getLocalDayAtMs } from "./localCalendar";
import { canonicalTagIds, selectionTitle, type TagGroup } from "./tagSelection";
import type { Activity, RunningActivity } from "../store/activity";

export interface ReceiptSegment {
  key: string;
  tagIds: string[];
  title: string;
  startMs: number;
  endMs: number;
  durationMinutes: number;
  ongoing: boolean;
}

export interface ReceiptTagTotal {
  id: string;
  name: string;
  minutes: number;
}

export interface ReceiptGroupTotal {
  id: string;
  name: string;
  tags: ReceiptTagTotal[];
}

export interface TodayReceipt {
  segments: ReceiptSegment[];
  groupedTotals: ReceiptGroupTotal[];
  elapsedMinutes: number;
  trackedMinutes: number;
  untrackedMinutes: number;
  coveragePercent: number;
}

interface TodayReceiptInput {
  activities: Activity[];
  runningActivity: RunningActivity | null;
  tagGroups: TagGroup[];
  day: string;
  nowMs: number;
}

interface DayBounds {
  year: number;
  monthIndex: number;
  dayOfMonth: number;
  startMs: number;
  endMs: number;
}

function emptyReceipt(): TodayReceipt {
  return {
    segments: [],
    groupedTotals: [],
    elapsedMinutes: 0,
    trackedMinutes: 0,
    untrackedMinutes: 0,
    coveragePercent: 0,
  };
}

function getDayBounds(day: string): DayBounds | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (match === null) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const dayOfMonth = Number(match[3]);
  const startMs = new Date(year, monthIndex, dayOfMonth).getTime();
  if (!Number.isFinite(startMs) || getLocalDayAtMs(startMs) !== day)
    return null;
  return {
    year,
    monthIndex,
    dayOfMonth,
    startMs,
    endMs: new Date(year, monthIndex, dayOfMonth + 1).getTime(),
  };
}

function getActivityStartMs(bounds: DayBounds, startMinutes: number): number {
  const wholeMinutes = Math.floor(startMinutes);
  const milliseconds = Math.round((startMinutes - wholeMinutes) * 60_000);
  return new Date(
    bounds.year,
    bounds.monthIndex,
    bounds.dayOfMonth,
    0,
    wholeMinutes,
    0,
    milliseconds,
  ).getTime();
}

interface ReceiptInterval {
  startMs: number;
  endMs: number;
}

function mergeIntervalMinutes(intervals: ReceiptInterval[]): number {
  if (intervals.length === 0) return 0;
  const ordered = [...intervals].sort(
    (left, right) => left.startMs - right.startMs,
  );
  let trackedMs = 0;
  let currentStart = ordered[0].startMs;
  let currentEnd = ordered[0].endMs;
  for (const interval of ordered.slice(1)) {
    if (interval.startMs <= currentEnd)
      currentEnd = Math.max(currentEnd, interval.endMs);
    else {
      trackedMs += currentEnd - currentStart;
      currentStart = interval.startMs;
      currentEnd = interval.endMs;
    }
  }
  return (trackedMs + currentEnd - currentStart) / 60_000;
}

export function buildTodayReceipt({
  activities,
  runningActivity,
  tagGroups,
  day,
  nowMs,
}: TodayReceiptInput): TodayReceipt {
  const bounds = getDayBounds(day);
  if (bounds === null) return emptyReceipt();
  const safeNowMs = Number.isFinite(nowMs) ? nowMs : bounds.startMs;
  const receiptEndMs = Math.min(
    Math.max(safeNowMs, bounds.startMs),
    bounds.endMs,
  );
  const segments: ReceiptSegment[] = [];

  const addSegment = (
    key: string,
    rawTagIds: readonly string[],
    startMs: number,
    endMs: number,
    ongoing: boolean,
  ) => {
    const tagIds = canonicalTagIds(rawTagIds, tagGroups);
    if (tagIds.length === 0 || endMs <= startMs) return;
    segments.push({
      key,
      tagIds,
      title: selectionTitle(tagIds, tagGroups),
      startMs,
      endMs,
      durationMinutes: (endMs - startMs) / 60_000,
      ongoing,
    });
  };

  for (const activity of activities) {
    if (
      activity.date !== day ||
      !Number.isFinite(activity.start_time_minutes) ||
      !Number.isFinite(activity.duration_minutes) ||
      activity.start_time_minutes < 0 ||
      activity.start_time_minutes > 1440 ||
      activity.duration_minutes <= 0
    )
      continue;
    const rawStartMs = getActivityStartMs(bounds, activity.start_time_minutes);
    const rawEndMs = rawStartMs + activity.duration_minutes * 60_000;
    addSegment(
      `activity:${activity.id}:${rawStartMs}`,
      activity.tagIds,
      Math.max(rawStartMs, bounds.startMs),
      Math.min(rawEndMs, receiptEndMs, bounds.endMs),
      false,
    );
  }

  if (
    runningActivity !== null &&
    Number.isFinite(runningActivity.startedAtMs) &&
    getLocalDayAtMs(runningActivity.startedAtMs) === day
  ) {
    addSegment(
      `running:${runningActivity.startedAtMs}`,
      runningActivity.tagIds,
      Math.max(runningActivity.startedAtMs, bounds.startMs),
      receiptEndMs,
      true,
    );
  }

  segments.sort(
    (left, right) =>
      left.startMs - right.startMs ||
      left.endMs - right.endMs ||
      left.key.localeCompare(right.key),
  );

  const intervalsByTag = new Map<string, ReceiptInterval[]>();
  for (const segment of segments) {
    for (const tagId of segment.tagIds) {
      const intervals = intervalsByTag.get(tagId) ?? [];
      intervals.push({ startMs: segment.startMs, endMs: segment.endMs });
      intervalsByTag.set(tagId, intervals);
    }
  }
  const groupedTotals = tagGroups
    .map((group) => ({
      id: group.id,
      name: group.name,
      tags: group.tags
        .filter((tag) => intervalsByTag.has(tag.id))
        .map((tag) => ({
          id: tag.id,
          name: tag.name,
          minutes: mergeIntervalMinutes(intervalsByTag.get(tag.id)!),
        })),
    }))
    .filter((group) => group.tags.length > 0);

  const elapsedMinutes = (receiptEndMs - bounds.startMs) / 60_000;
  const trackedMinutes = Math.min(
    elapsedMinutes,
    mergeIntervalMinutes(segments),
  );
  const untrackedMinutes = Math.max(0, elapsedMinutes - trackedMinutes);
  const coveragePercent =
    elapsedMinutes === 0 ? 0 : (trackedMinutes / elapsedMinutes) * 100;
  return {
    segments,
    groupedTotals,
    elapsedMinutes,
    trackedMinutes,
    untrackedMinutes,
    coveragePercent,
  };
}

export function formatReceiptDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0m";
  if (minutes < 1) return "<1m";
  const roundedMinutes = Math.round(minutes);
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatReceiptClock(timeMs: number): string {
  const date = new Date(timeMs);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}
