import { defineStore } from "pinia";
import {
  getLocalDayAtMs,
  getLocalMinuteOfDay,
  getNextLocalMidnightMs,
} from "../function/localCalendar";
import {
  canonicalTagIds,
  isValidSelection,
  selectionKey,
  selectionsEqual,
  normalizeSelection,
  selectionTitle,
  type TagGroup,
} from "../function/tagSelection";

export interface Activity {
  id: number;
  tagIds: string[];
  start_time_minutes: number;
  duration_minutes: number;
  date: string;
}

export interface RunningActivity {
  tagIds: string[];
  startedAtMs: number;
}

interface LastCaptureUndo {
  transitionedAtMs: number;
  previousRunning: RunningActivity | null;
  resultingRunning: RunningActivity | null;
  createdActivity: Activity | null;
}

export type DayActivityInput = Omit<Activity, "id" | "date">;

interface State {
  activities: Activity[];
  nextId: number;
  runningActivity: RunningActivity | null;
  lastCaptureUndo: LastCaptureUndo | null;
  tagGroups: TagGroup[];
  nextTagId: number;
  nextGroupId: number;
}

function findAvailableActivityId(
  activities: Activity[],
  nextId: number,
): number {
  const usedIds = new Set(activities.map((activity) => activity.id));
  let candidate = Math.max(1, nextId);
  while (usedIds.has(candidate)) candidate += 1;
  return candidate;
}

function nextStringId(
  prefix: string,
  nextId: number,
  used: Set<string>,
): [string, number] {
  let candidate = Math.max(1, nextId);
  while (used.has(`${prefix}-${candidate}`)) candidate += 1;
  return [`${prefix}-${candidate}`, candidate + 1];
}

function cloneRunning(running: RunningActivity | null): RunningActivity | null {
  return running === null ? null : { ...running, tagIds: [...running.tagIds] };
}

function cloneActivity(activity: Activity): Activity {
  return { ...activity, tagIds: [...activity.tagIds] };
}

function sameRunning(
  left: RunningActivity | null,
  right: RunningActivity | null,
): boolean {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left.startedAtMs === right.startedAtMs &&
      selectionsEqual(left.tagIds, right.tagIds))
  );
}

function sameActivity(left: Activity, right: Activity): boolean {
  return (
    left.id === right.id &&
    selectionsEqual(left.tagIds, right.tagIds) &&
    left.start_time_minutes === right.start_time_minutes &&
    left.duration_minutes === right.duration_minutes &&
    left.date === right.date
  );
}

function normalizedName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export const useActivityStore = defineStore("dayxday-structured-tags-v1", {
  state: (): State => ({
    activities: [],
    nextId: 1,
    runningActivity: null,
    lastCaptureUndo: null,
    tagGroups: [],
    nextTagId: 1,
    nextGroupId: 1,
  }),
  persist: true,
  getters: {
    getActivitiesForDay:
      (state) =>
      (date: string): Activity[] =>
        state.activities
          .filter(
            (activity) =>
              activity.date === date &&
              activity.start_time_minutes >= 0 &&
              activity.start_time_minutes <= 1440,
          )
          .sort(
            (left, right) => left.start_time_minutes - right.start_time_minutes,
          ),
    findActivityAtTime:
      (state) =>
      (time: number, date: string): Activity | null =>
        state.activities.find(
          (activity) =>
            activity.date === date &&
            time >= activity.start_time_minutes &&
            time < activity.start_time_minutes + activity.duration_minutes,
        ) ?? null,
    findActivitiesAfterTime:
      (state) =>
      (time: number, date: string): Activity[] =>
        state.activities
          .filter(
            (activity) =>
              activity.date === date && activity.start_time_minutes > time,
          )
          .sort(
            (left, right) => left.start_time_minutes - right.start_time_minutes,
          ),
    activeTagGroups(state): TagGroup[] {
      return state.tagGroups
        .map((group) => ({
          ...group,
          tags: group.tags.filter((tag) => tag.archived !== true),
        }))
        .filter((group) => group.tags.length > 0);
    },
    titleForSelection:
      (state) =>
      (tagIds: readonly string[]): string =>
        selectionTitle(tagIds, state.tagGroups),
    recentTagSelections(state): string[][] {
      const selections: string[][] = [];
      const seen = new Set<string>();
      const runningKey = state.runningActivity
        ? selectionKey(state.runningActivity.tagIds)
        : null;
      const newestFirst = [...state.activities].sort((left, right) => {
        const dateOrder = right.date.localeCompare(left.date);
        if (dateOrder !== 0) return dateOrder;
        return (
          right.start_time_minutes - left.start_time_minutes ||
          right.id - left.id
        );
      });

      for (const activity of newestFirst) {
        if (!isValidSelection(activity.tagIds, state.tagGroups, true)) continue;
        const key = selectionKey(activity.tagIds);
        if (key === runningKey || seen.has(key)) continue;
        selections.push(canonicalTagIds(activity.tagIds, state.tagGroups));
        seen.add(key);
        if (selections.length === 6) break;
      }
      return selections;
    },
    canUndoLastTransition(state): boolean {
      const undo = state.lastCaptureUndo;
      if (
        undo === null ||
        !sameRunning(state.runningActivity, undo.resultingRunning)
      ) {
        return false;
      }
      if (undo.createdActivity === null) return true;
      const current = state.activities.find(
        (activity) => activity.id === undo.createdActivity?.id,
      );
      return (
        current !== undefined && sameActivity(current, undo.createdActivity)
      );
    },
  },
  actions: {
    isTagNameAvailable(name: string, exceptTagId?: string): boolean {
      const normalized = normalizedName(name);
      if (normalized === null) return false;
      const folded = normalized.toLocaleLowerCase();
      return !this.tagGroups.some((group) =>
        group.tags.some(
          (tag) =>
            tag.id !== exceptTagId && tag.name.toLocaleLowerCase() === folded,
        ),
      );
    },
    createGroup(groupName: string, initialTagName: string): boolean {
      const name = normalizedName(groupName);
      const tagName = normalizedName(initialTagName);
      if (
        name === null ||
        tagName === null ||
        !this.isTagNameAvailable(tagName)
      ) {
        return false;
      }
      const groupIds = new Set(this.tagGroups.map((group) => group.id));
      const tagIds = new Set(
        this.tagGroups.flatMap((group) => group.tags.map((tag) => tag.id)),
      );
      const [groupId, nextGroupId] = nextStringId(
        "group",
        this.nextGroupId,
        groupIds,
      );
      const [tagId, nextTagId] = nextStringId("tag", this.nextTagId, tagIds);
      this.tagGroups.push({
        id: groupId,
        name,
        tags: [{ id: tagId, name: tagName }],
      });
      this.nextGroupId = nextGroupId;
      this.nextTagId = nextTagId;
      return true;
    },
    renameGroup(groupId: string, groupName: string): boolean {
      const group = this.tagGroups.find(
        (candidate) => candidate.id === groupId,
      );
      const name = normalizedName(groupName);
      if (!group || name === null) return false;
      group.name = name;
      return true;
    },
    toggleGroupExclusive(groupId: string, nowMs = Date.now()) {
      const group = this.tagGroups.find(
        (candidate) => candidate.id === groupId,
      );
      if (!group) return;
      if (group.exclusive === true) {
        delete group.exclusive;
        this.invalidateCaptureUndo();
        return;
      }

      group.exclusive = true;
      this.invalidateCaptureUndo();
      if (!Number.isFinite(nowMs)) return;
      this.reconcileRunning(nowMs);
      const running = cloneRunning(this.runningActivity);
      if (running === null) return;
      const selectedFromGroup = group.tags.filter((tag) =>
        running.tagIds.includes(tag.id),
      );
      if (selectedFromGroup.length <= 1) return;

      this.appendClosedRunningActivity(running, nowMs);
      this.runningActivity = {
        tagIds: normalizeSelection(running.tagIds, this.tagGroups, false),
        startedAtMs: nowMs,
      };
      this.invalidateCaptureUndo();
    },
    moveGroup(groupId: string, offset: -1 | 1) {
      const index = this.tagGroups.findIndex((group) => group.id === groupId);
      const destination = index + offset;
      if (index < 0 || destination < 0 || destination >= this.tagGroups.length)
        return;
      const [group] = this.tagGroups.splice(index, 1);
      this.tagGroups.splice(destination, 0, group);
    },
    addTag(groupId: string, tagName: string): boolean {
      const group = this.tagGroups.find(
        (candidate) => candidate.id === groupId,
      );
      const name = normalizedName(tagName);
      if (!group || name === null || !this.isTagNameAvailable(name))
        return false;
      const used = new Set(
        this.tagGroups.flatMap((candidate) =>
          candidate.tags.map((tag) => tag.id),
        ),
      );
      const [id, nextId] = nextStringId("tag", this.nextTagId, used);
      group.tags.push({ id, name });
      this.nextTagId = nextId;
      return true;
    },
    renameTag(tagId: string, tagName: string): boolean {
      const tag = this.tagGroups
        .flatMap((group) => group.tags)
        .find((candidate) => candidate.id === tagId);
      const name = normalizedName(tagName);
      if (!tag || name === null || !this.isTagNameAvailable(name, tagId))
        return false;
      tag.name = name;
      return true;
    },
    moveTag(groupId: string, tagId: string, offset: -1 | 1) {
      const group = this.tagGroups.find(
        (candidate) => candidate.id === groupId,
      );
      if (!group) return;
      const index = group.tags.findIndex((tag) => tag.id === tagId);
      if (index < 0 || group.tags[index].archived === true) return;
      const activeIndexes = group.tags.flatMap((tag, tagIndex) =>
        tag.archived === true ? [] : [tagIndex],
      );
      const activeIndex = activeIndexes.indexOf(index);
      const destinationIndex = activeIndexes[activeIndex + offset];
      if (destinationIndex === undefined) return;
      [group.tags[index], group.tags[destinationIndex]] = [
        group.tags[destinationIndex],
        group.tags[index],
      ];
    },
    archiveTag(tagId: string) {
      const tag = this.tagGroups
        .flatMap((group) => group.tags)
        .find((candidate) => candidate.id === tagId);
      if (tag) {
        tag.archived = true;
        this.invalidateCaptureUndo();
      }
    },
    restoreTag(tagId: string): boolean {
      const tag = this.tagGroups
        .flatMap((group) => group.tags)
        .find((candidate) => candidate.id === tagId);
      if (!tag || !this.isTagNameAvailable(tag.name, tag.id)) return false;
      delete tag.archived;
      return true;
    },
    invalidateCaptureUndo() {
      this.lastCaptureUndo = null;
    },
    appendClosedRunningActivity(
      running: RunningActivity,
      endMs: number,
    ): Activity | null {
      if (endMs <= running.startedAtMs) return null;
      const nextMidnightMs = getNextLocalMidnightMs(running.startedAtMs);
      const boundedEndMs = Math.min(endMs, nextMidnightMs);
      if (boundedEndMs <= running.startedAtMs) return null;
      const startMinutes = getLocalMinuteOfDay(new Date(running.startedAtMs));
      const durationMinutes = (boundedEndMs - running.startedAtMs) / 60_000;
      if (durationMinutes <= 0 || running.tagIds.length === 0) return null;
      const id = findAvailableActivityId(this.activities, this.nextId);
      const activity: Activity = {
        id,
        tagIds: [...running.tagIds],
        start_time_minutes: startMinutes,
        duration_minutes: durationMinutes,
        date: getLocalDayAtMs(running.startedAtMs),
      };
      this.activities.push(activity);
      this.nextId = id + 1;
      return activity;
    },
    reconcileRunning(nowMs: number) {
      if (!Number.isFinite(nowMs)) return;
      if (
        this.lastCaptureUndo !== null &&
        nowMs >= getNextLocalMidnightMs(this.lastCaptureUndo.transitionedAtMs)
      ) {
        this.invalidateCaptureUndo();
      }
      if (this.runningActivity === null) return;
      if (
        this.runningActivity.startedAtMs > nowMs ||
        this.runningActivity.tagIds.length === 0
      ) {
        this.runningActivity = null;
        this.invalidateCaptureUndo();
        return;
      }
      const midnight = getNextLocalMidnightMs(this.runningActivity.startedAtMs);
      if (nowMs < midnight) return;
      this.appendClosedRunningActivity(this.runningActivity, midnight);
      this.runningActivity = null;
      this.invalidateCaptureUndo();
    },
    transitionTo(tagIds: readonly string[], nowMs: number) {
      if (!Array.isArray(tagIds) || !Number.isFinite(nowMs)) return;
      if (!isValidSelection(tagIds, this.tagGroups, true)) return;
      const canonical = canonicalTagIds(tagIds, this.tagGroups);
      this.reconcileRunning(nowMs);
      if (
        this.runningActivity &&
        selectionsEqual(this.runningActivity.tagIds, canonical)
      )
        return;
      const previousRunning = cloneRunning(this.runningActivity);
      const createdActivity = previousRunning
        ? this.appendClosedRunningActivity(previousRunning, nowMs)
        : null;
      const resultingRunning: RunningActivity = {
        tagIds: [...canonical],
        startedAtMs: nowMs,
      };
      this.runningActivity = resultingRunning;
      this.lastCaptureUndo = {
        transitionedAtMs: nowMs,
        previousRunning,
        resultingRunning: cloneRunning(resultingRunning),
        createdActivity: createdActivity
          ? cloneActivity(createdActivity)
          : null,
      };
    },
    stop(nowMs: number) {
      if (!Number.isFinite(nowMs)) return;
      this.reconcileRunning(nowMs);
      if (this.runningActivity === null) return;
      const previousRunning = cloneRunning(this.runningActivity)!;
      const createdActivity = this.appendClosedRunningActivity(
        previousRunning,
        nowMs,
      );
      this.runningActivity = null;
      this.lastCaptureUndo = {
        transitionedAtMs: nowMs,
        previousRunning,
        resultingRunning: null,
        createdActivity: createdActivity
          ? cloneActivity(createdActivity)
          : null,
      };
    },
    undoLastTransition(nowMs: number) {
      const undo = this.lastCaptureUndo;
      if (
        undo === null ||
        !Number.isFinite(nowMs) ||
        nowMs < undo.transitionedAtMs ||
        nowMs >= getNextLocalMidnightMs(undo.transitionedAtMs) ||
        !this.canUndoLastTransition
      ) {
        this.invalidateCaptureUndo();
        return;
      }
      if (undo.createdActivity) {
        this.activities = this.activities.filter(
          (activity) => activity.id !== undo.createdActivity?.id,
        );
      }
      this.runningActivity = cloneRunning(undo.previousRunning);
      this.invalidateCaptureUndo();
    },
    initializeActivities(activities: Activity[]) {
      this.invalidateCaptureUndo();
      this.activities = activities.map(cloneActivity);
      this.nextId = this.activities.length
        ? Math.max(...this.activities.map((activity) => activity.id)) + 1
        : 1;
    },
    replaceActivitiesForDay(date: string, activities: DayActivityInput[]) {
      this.invalidateCaptureUndo();
      const otherDays = this.activities.filter(
        (activity) => activity.date !== date,
      );
      const replacements: Activity[] = [];
      let nextId = this.nextId;
      for (const activity of activities) {
        if (!isValidSelection(activity.tagIds, this.tagGroups, false)) continue;
        const id = findAvailableActivityId(
          [...otherDays, ...replacements],
          nextId,
        );
        replacements.push({
          ...activity,
          tagIds: canonicalTagIds(activity.tagIds, this.tagGroups),
          id,
          date,
        });
        nextId = id + 1;
      }
      this.activities = [...otherDays, ...replacements];
      this.nextId = nextId;
    },
    clearActivitiesForDay(date: string) {
      this.invalidateCaptureUndo();
      this.activities = this.activities.filter(
        (activity) => activity.date !== date,
      );
    },
    updateActivity(id: number, updates: Partial<Activity>) {
      const activity = this.activities.find((candidate) => candidate.id === id);
      if (!activity) return;
      if (
        updates.tagIds !== undefined &&
        !isValidSelection(updates.tagIds, this.tagGroups, false)
      )
        return;
      this.invalidateCaptureUndo();
      Object.assign(activity, updates);
      if (updates.tagIds)
        activity.tagIds = canonicalTagIds(updates.tagIds, this.tagGroups);
    },
    removeActivity(id: number) {
      if (!this.activities.some((activity) => activity.id === id)) return;
      this.invalidateCaptureUndo();
      this.activities = this.activities.filter(
        (activity) => activity.id !== id,
      );
    },
    insertActivityAtTime(
      time: number,
      date: string,
      newActivity: Pick<Activity, "tagIds">,
      endLimitMinutes: number,
    ) {
      if (
        !Number.isFinite(time) ||
        !Number.isFinite(endLimitMinutes) ||
        time < 0 ||
        time >= 1440 ||
        endLimitMinutes <= time ||
        !isValidSelection(newActivity.tagIds, this.tagGroups, false)
      )
        return;
      const existingActivity = this.findActivityAtTime(time, date);
      const nextActivities = this.findActivitiesAfterTime(time, date);
      const nextStart = nextActivities.length
        ? nextActivities[0].start_time_minutes
        : 1440;
      const newEnd = Math.min(nextStart, endLimitMinutes, 1440);
      if (newEnd <= time) return;
      this.invalidateCaptureUndo();
      if (existingActivity) {
        if (existingActivity.start_time_minutes === time) {
          this.activities = this.activities.filter(
            (activity) => activity.id !== existingActivity.id,
          );
        } else {
          existingActivity.duration_minutes =
            time - existingActivity.start_time_minutes;
        }
      }
      const id = findAvailableActivityId(this.activities, this.nextId);
      this.activities.push({
        id,
        tagIds: canonicalTagIds(newActivity.tagIds, this.tagGroups),
        start_time_minutes: time,
        duration_minutes: newEnd - time,
        date,
      });
      this.nextId = id + 1;
      this.activities.sort(
        (left, right) => left.start_time_minutes - right.start_time_minutes,
      );
    },
  },
});
