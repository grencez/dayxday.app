import { defineStore } from "pinia";

export interface Activity {
  id: number;
  name: string;
  start_time_minutes: number;
  duration_minutes: number;
  date: string; // ISO 8601 YYYY-MM-DD
}

export type DayActivityInput = Omit<Activity, "id" | "date">;

interface State {
  activities: Activity[];
  nextId: number;
}

function findAvailableId(activities: Activity[], nextId: number): number {
  const usedIds = new Set(activities.map((activity) => activity.id));
  let candidate = Math.max(1, nextId);

  while (usedIds.has(candidate)) {
    candidate += 1;
  }

  return candidate;
}

export const useActivityStore = defineStore("activity", {
  state: (): State => ({
    activities: [],
    nextId: 1,
  }),
  persist: true, // Defaults to localStorage
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
  },
  actions: {
    initializeActivities(activities: Activity[]) {
      this.activities = activities;
      this.nextId =
        this.activities.length > 0
          ? Math.max(...this.activities.map((a) => a.id)) + 1
          : 1;
    },
    replaceActivitiesForDay(date: string, activities: DayActivityInput[]) {
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
      this.activities = this.activities.filter(
        (activity) => activity.date !== date,
      );
    },
    updateActivity(id: number, updates: Partial<Activity>) {
      const activity = this.activities.find((a) => a.id === id);
      if (activity) {
        Object.assign(activity, updates);
      }
    },
    removeActivity(id: number) {
      this.activities = this.activities.filter((a) => a.id !== id);
    },
    insertActivityAtTime(
      time: number,
      date: string,
      newActivity: Omit<Activity, "id" | "duration_minutes" | "date">,
    ) {
      const existingActivity = this.findActivityAtTime(time, date);
      const nextActivities = this.findActivitiesAfterTime(time, date);

      if (existingActivity) {
        if (existingActivity.start_time_minutes === time) {
          this.removeActivity(existingActivity.id);
        } else {
          existingActivity.duration_minutes =
            time - existingActivity.start_time_minutes;
        }
      }

      let newDuration: number;
      if (nextActivities.length > 0) {
        newDuration = nextActivities[0].start_time_minutes - time;
      } else {
        newDuration = 1440 - time; // Assuming 1440 as the end of the day
      }

      const id = findAvailableId(this.activities, this.nextId);
      const fullNewActivity: Activity = {
        ...newActivity,
        id,
        start_time_minutes: time,
        duration_minutes: newDuration,
        date: date,
      };
      this.activities.push(fullNewActivity);
      this.nextId = id + 1;
      this.activities.sort(
        (a, b) => a.start_time_minutes - b.start_time_minutes,
      );
    },
  },
});
