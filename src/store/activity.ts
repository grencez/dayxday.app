import { defineStore } from "pinia";

export interface Activity {
  id: number;
  name: string;
  start_time_minutes: number;
  duration_minutes: number;
}

interface State {
  activities: Activity[];
  nextId: number;
}

export const useActivityStore = defineStore("activity", {
  state: (): State => ({
    activities: [],
    nextId: 1,
  }),
  getters: {
    getActivitiesForDay(state): Activity[] {
      return state.activities
        .filter(
          (activity) =>
            activity.start_time_minutes >= 0 &&
            activity.start_time_minutes <= 1440,
        )
        .sort((a, b) => a.start_time_minutes - b.start_time_minutes);
    },
    findActivityAtTime:
      (state) =>
      (time: number): Activity | null => {
        return (
          state.activities.find(
            (activity) =>
              time >= activity.start_time_minutes &&
              time < activity.start_time_minutes + activity.duration_minutes,
          ) || null
        );
      },
    findActivitiesFromTime:
      (state) =>
      (time: number): Activity[] => {
        return state.activities
          .filter((activity) =>
            activity.start_time_minutes + activity.duration_minutes > time
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
      newActivity: Omit<Activity, "id" | "duration_minutes">,
    ) {
      const existingActivity = this.findActivityAtTime(time);
      const nextActivities = this.findActivitiesFromTime(time);

      let newDuration: number;
      if (nextActivities.length > 0) {
        newDuration = nextActivities[0].start_time_minutes - time;
      } else {
        newDuration = 1440 - time; // Assuming 1440 as the end of the day
      }

      if (existingActivity) {
        const newExistingDuration = time - existingActivity.start_time_minutes;
        if (newExistingDuration > 0) {
          existingActivity.duration_minutes = newExistingDuration;
        }
      }

      const fullNewActivity: Activity = {
        ...newActivity,
        id: this.nextId++,
        start_time_minutes: time,
        duration_minutes: newDuration,
      };
      this.activities.push(fullNewActivity);
      this.activities.sort((a, b) => a.start_time_minutes - b.start_time_minutes);
    },
  },
});
