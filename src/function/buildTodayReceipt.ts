import { getLocalDayAtMs } from "./localCalendar";
import type { Activity, RunningActivity } from "../store/activity";

export interface ReceiptSegment {
  key: string;
  name: string;
  startMs: number;
  endMs: number;
  durationMinutes: number;
  ongoing: boolean;
}

export interface ReceiptTotal {
  name: string;
  minutes: number;
}

export interface TodayReceipt {
  segments: ReceiptSegment[];
  totals: ReceiptTotal[];
  elapsedMinutes: number;
  trackedMinutes: number;
  untrackedMinutes: number;
  coveragePercent: number;
}

interface TodayReceiptInput {
  activities: Activity[];
  runningActivity: RunningActivity | null;
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

function getDayBounds(day: string): DayBounds | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (match === null) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const dayOfMonth = Number(match[3]);
  const startMs = new Date(year, monthIndex, dayOfMonth).getTime();
  if (!Number.isFinite(startMs) || getLocalDayAtMs(startMs) !== day) {
    return null;
  }

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

function normalizeName(name: unknown): string {
  if (typeof name !== "string") return "Unnamed activity";
  return name.trim() || "Unnamed activity";
}

function mergeTrackedMinutes(segments: ReceiptSegment[]): number {
  if (segments.length === 0) return 0;

  const intervals = segments
    .map(({ startMs, endMs }) => ({ startMs, endMs }))
    .sort((left, right) => left.startMs - right.startMs);
  let trackedMs = 0;
  let currentStart = intervals[0].startMs;
  let currentEnd = intervals[0].endMs;

  for (const interval of intervals.slice(1)) {
    if (interval.startMs <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.endMs);
    } else {
      trackedMs += currentEnd - currentStart;
      currentStart = interval.startMs;
      currentEnd = interval.endMs;
    }
  }
  trackedMs += currentEnd - currentStart;
  return trackedMs / 60_000;
}

export function buildTodayReceipt({
  activities,
  runningActivity,
  day,
  nowMs,
}: TodayReceiptInput): TodayReceipt {
  const bounds = getDayBounds(day);
  if (bounds === null) {
    return {
      segments: [],
      totals: [],
      elapsedMinutes: 0,
      trackedMinutes: 0,
      untrackedMinutes: 0,
      coveragePercent: 0,
    };
  }

  const safeNowMs = Number.isFinite(nowMs) ? nowMs : bounds.startMs;
  const receiptEndMs = Math.min(
    Math.max(safeNowMs, bounds.startMs),
    bounds.endMs,
  );
  const segments: ReceiptSegment[] = [];

  for (const activity of activities) {
    if (
      activity.date !== day ||
      !Number.isFinite(activity.start_time_minutes) ||
      !Number.isFinite(activity.duration_minutes) ||
      activity.start_time_minutes < 0 ||
      activity.start_time_minutes > 1440 ||
      activity.duration_minutes <= 0
    ) {
      continue;
    }

    const rawStartMs = getActivityStartMs(bounds, activity.start_time_minutes);
    const rawEndMs = rawStartMs + activity.duration_minutes * 60_000;
    const startMs = Math.max(rawStartMs, bounds.startMs);
    const endMs = Math.min(rawEndMs, receiptEndMs, bounds.endMs);
    if (endMs <= startMs) continue;

    segments.push({
      key: `activity:${activity.id}:${rawStartMs}`,
      name: normalizeName(activity.name),
      startMs,
      endMs,
      durationMinutes: (endMs - startMs) / 60_000,
      ongoing: false,
    });
  }

  if (
    runningActivity !== null &&
    Number.isFinite(runningActivity.startedAtMs) &&
    getLocalDayAtMs(runningActivity.startedAtMs) === day
  ) {
    const startMs = Math.max(runningActivity.startedAtMs, bounds.startMs);
    if (startMs < receiptEndMs) {
      segments.push({
        key: `running:${runningActivity.startedAtMs}`,
        name: normalizeName(runningActivity.name),
        startMs,
        endMs: receiptEndMs,
        durationMinutes: (receiptEndMs - startMs) / 60_000,
        ongoing: true,
      });
    }
  }

  segments.sort(
    (left, right) =>
      left.startMs - right.startMs ||
      left.endMs - right.endMs ||
      left.key.localeCompare(right.key),
  );

  const totalsByName = new Map<string, number>();
  for (const segment of segments) {
    totalsByName.set(
      segment.name,
      (totalsByName.get(segment.name) ?? 0) + segment.durationMinutes,
    );
  }
  const totals = [...totalsByName.entries()]
    .map(([name, minutes]) => ({ name, minutes }))
    .sort(
      (left, right) =>
        right.minutes - left.minutes || left.name.localeCompare(right.name),
    );

  const elapsedMinutes = (receiptEndMs - bounds.startMs) / 60_000;
  const trackedMinutes = Math.min(
    elapsedMinutes,
    mergeTrackedMinutes(segments),
  );
  const untrackedMinutes = Math.max(0, elapsedMinutes - trackedMinutes);
  const coveragePercent =
    elapsedMinutes === 0 ? 0 : (trackedMinutes / elapsedMinutes) * 100;

  return {
    segments,
    totals,
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
