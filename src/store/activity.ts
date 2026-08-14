import { defineStore } from "pinia";
import {
  getLocalDayAtMs,
  getLocalMinuteOfDay,
  getNextLocalMidnightMs,
} from "../function/localCalendar";

export interface Activity {
  id: number;
  name: string;
  start_time_minutes: number;
  duration_minutes: number;
  date: string; // ISO 8601 YYYY-MM-DD
}

export interface RunningActivity {
  name: string;
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
}

function findAvailableId(activities: Activity[], nextId: number): number {
  const usedIds = new Set(activities.map((activity) => activity.id));
  let candidate = Math.max(1, nextId);

  while (usedIds.has(candidate)) {
    candidate += 1;
  }

  return candidate;
}

function sameRunningActivity(
  left: RunningActivity | null,
  right: RunningActivity | null,
): boolean {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left.name === right.name &&
      left.startedAtMs === right.startedAtMs)
  );
}

function sameActivity(left: Activity, right: Activity): boolean {
  return (
    left.id === right.id &&
    left.name === right.name &&
    left.start_time_minutes === right.start_time_minutes &&
    left.duration_minutes === right.duration_minutes &&
    left.date === right.date
  );
}

function cloneRunning(
  runningActivity: RunningActivity | null,
): RunningActivity | null {
  return runningActivity === null ? null : { ...runningActivity };
}

export const useActivityStore = defineStore("activity", {
  state: (): State => ({
    activities: [],
    nextId: 1,
    runningActivity: null,
    lastCaptureUndo: null,
  }),
  persist: true,
  getters: {
    getActivitiesForDay:
      (state) =>
      (date: string): Activity[] => {
        return state.activities
          .filter(
            (activity) =>
              activity.date === date &&
              activity.start_time_minutes >= 0 &&
              activity.start_time_minutes <= 1440,
          )
          .sort((a, b) => a.start_time_minutes - b.start_time_minutes);
      },
    findActivityAtTime:
      (state) =>
      (time: number, date: string): Activity | null => {
        return (
          state.activities.find(
            (activity) =>
              activity.date === date &&
              time >= activity.start_time_minutes &&
              time < activity.start_time_minutes + activity.duration_minutes,
          ) || null
        );
      },
    findActivitiesAfterTime:
      (state) =>
      (time: number, date: string): Activity[] => {
        return state.activities
          .filter(
            (activity) =>
              activity.date === date && activity.start_time_minutes > time,
          )
          .sort((a, b) => a.start_time_minutes - b.start_time_minutes);
      },
    recentActivityNames(state): string[] {
      const names: string[] = [];
      const seen = new Set<string>();
      const newestFirst = [...state.activities].sort((left, right) => {
        const dateOrder = right.date.localeCompare(left.date);
        if (dateOrder !== 0) return dateOrder;
        const timeOrder = right.start_time_minutes - left.start_time_minutes;
        return timeOrder !== 0 ? timeOrder : right.id - left.id;
      });

      for (const activity of newestFirst) {
        if (typeof activity.name !== "string") continue;

        const name = activity.name.trim();
        if (
          name.length === 0 ||
          name === state.runningActivity?.name ||
          seen.has(name)
        ) {
          continue;
        }
        names.push(name);
        seen.add(name);
        if (names.length === 6) break;
      }

      return names;
    },
    canUndoLastTransition(state): boolean {
      const undo = state.lastCaptureUndo;
      if (undo === null) return false;
      if (!sameRunningActivity(state.runningActivity, undo.resultingRunning)) {
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
    invalidateCaptureUndo() {
      this.lastCaptureUndo = null;
    },
    appendClosedRunningActivity(
      running: RunningActivity,
      endMs: number,
    ): Activity | null {
      if (endMs <= running.startedAtMs) return null;

      const startDate = new Date(running.startedAtMs);
      const nextMidnightMs = getNextLocalMidnightMs(running.startedAtMs);
      const boundedEndMs = Math.min(endMs, nextMidnightMs);
      if (boundedEndMs <= running.startedAtMs) return null;

      const startMinutes = getLocalMinuteOfDay(startDate);
      const durationMinutes = (boundedEndMs - running.startedAtMs) / 60_000;
      if (durationMinutes <= 0) return null;

      const id = findAvailableId(this.activities, this.nextId);
      const activity: Activity = {
        id,
        name: running.name,
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

      if (this.runningActivity.startedAtMs > nowMs) {
        this.runningActivity = null;
        this.invalidateCaptureUndo();
        return;
      }

      const nextMidnightMs = getNextLocalMidnightMs(
        this.runningActivity.startedAtMs,
      );
      if (nowMs < nextMidnightMs) return;

      this.appendClosedRunningActivity(this.runningActivity, nextMidnightMs);
      this.runningActivity = null;
      this.invalidateCaptureUndo();
    },
    transitionTo(name: string, nowMs: number) {
      if (typeof name !== "string" || !Number.isFinite(nowMs)) return;

      const normalizedName = name.trim();
      if (normalizedName.length === 0) return;

      this.reconcileRunning(nowMs);
      if (this.runningActivity?.name === normalizedName) return;

      const previousRunning = cloneRunning(this.runningActivity);
      const createdActivity =
        previousRunning === null
          ? null
          : this.appendClosedRunningActivity(previousRunning, nowMs);
      const resultingRunning: RunningActivity = {
        name: normalizedName,
        startedAtMs: nowMs,
      };
      this.runningActivity = resultingRunning;
      this.lastCaptureUndo = {
        transitionedAtMs: nowMs,
        previousRunning,
        resultingRunning: { ...resultingRunning },
        createdActivity:
          createdActivity === null ? null : { ...createdActivity },
      };
    },
    stop(nowMs: number) {
      if (!Number.isFinite(nowMs)) return;

      this.reconcileRunning(nowMs);
      if (this.runningActivity === null) return;

      const previousRunning = cloneRunning(this.runningActivity);
      const createdActivity = this.appendClosedRunningActivity(
        previousRunning!,
        nowMs,
      );
      this.runningActivity = null;
      this.lastCaptureUndo = {
        transitionedAtMs: nowMs,
        previousRunning,
        resultingRunning: null,
        createdActivity:
          createdActivity === null ? null : { ...createdActivity },
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

      if (undo.createdActivity !== null) {
        this.activities = this.activities.filter(
          (activity) => activity.id !== undo.createdActivity?.id,
        );
      }
      this.runningActivity = cloneRunning(undo.previousRunning);
      this.invalidateCaptureUndo();
    },
    initializeActivities(activities: Activity[]) {
      this.invalidateCaptureUndo();
      this.activities = activities;
      this.nextId =
        this.activities.length > 0
          ? Math.max(...this.activities.map((a) => a.id)) + 1
          : 1;
    },
    replaceActivitiesForDay(date: string, activities: DayActivityInput[]) {
      this.invalidateCaptureUndo();
      const activitiesForOtherDays = this.activities.filter(
        (activity) => activity.date !== date,
      );
      const replacements: Activity[] = [];
      let nextId = this.nextId;

      for (const activity of activities) {
        const id = findAvailableId(
          [...activitiesForOtherDays, ...replacements],
          nextId,
        );
        replacements.push({ ...activity, id, date });
        nextId = id + 1;
      }

      this.activities = [...activitiesForOtherDays, ...replacements];
      this.nextId = nextId;
    },
    clearActivitiesForDay(date: string) {
      this.invalidateCaptureUndo();
      this.activities = this.activities.filter(
        (activity) => activity.date !== date,
      );
    },
    updateActivity(id: number, updates: Partial<Activity>) {
      const activity = this.activities.find((a) => a.id === id);
      if (activity) {
        this.invalidateCaptureUndo();
        Object.assign(activity, updates);
      }
    },
    removeActivity(id: number) {
      if (this.activities.some((activity) => activity.id === id)) {
        this.invalidateCaptureUndo();
        this.activities = this.activities.filter((a) => a.id !== id);
      }
    },
    insertActivityAtTime(
      time: number,
      date: string,
      newActivity: Pick<Activity, "name">,
      endLimitMinutes: number,
    ) {
      if (
        !Number.isFinite(time) ||
        !Number.isFinite(endLimitMinutes) ||
        time < 0 ||
        time >= 1440 ||
        endLimitMinutes <= time
      ) {
        return;
      }

      const existingActivity = this.findActivityAtTime(time, date);
      const nextActivities = this.findActivitiesAfterTime(time, date);
      const nextStart =
        nextActivities.length > 0 ? nextActivities[0].start_time_minutes : 1440;
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

      const id = findAvailableId(this.activities, this.nextId);
      const fullNewActivity: Activity = {
        name: newActivity.name,
        id,
        start_time_minutes: time,
        duration_minutes: newEnd - time,
        date,
      };
      this.activities.push(fullNewActivity);
      this.nextId = id + 1;
      this.activities.sort(
        (a, b) => a.start_time_minutes - b.start_time_minutes,
      );
    },
  },
});
