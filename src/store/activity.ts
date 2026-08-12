import { defineStore } from "pinia";
import { Activity } from "../model/Activity";

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
          (activity) => activity.startTime >= 0 && activity.startTime <= 1440,
        )
        .sort((a, b) => a.startTime - b.startTime);
    },
    findActivityAtTime:
      (state) =>
      (time: number): Activity | null => {
        return (
          state.activities.find(
            (activity) =>
              time >= activity.startTime &&
              time < activity.startTime + activity.duration,
          ) || null
        );
      },
    findActivitiesFromTime:
      (state) =>
      (time: number): Activity[] => {
        return state.activities
          .filter((activity) => activity.startTime >= time)
          .sort((a, b) => a.startTime - b.startTime);
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
    insertActivityAtTime(
      time: number,
      newActivity: Omit<Activity, "id" | "duration">,
    ) {
      const existingActivity = this.findActivityAtTime(time);
      const nextActivities = this.findActivitiesFromTime(time);

      let newDuration: number;
      if (existingActivity && existingActivity.startTime === time) {
        // Remove the existing activity if the new activity starts at the same time
        newDuration = existingActivity.duration;
        this.activities = this.activities.filter(
          (a) => a.id !== existingActivity.id,
        );
      } else {
        if (nextActivities.length > 0) {
          newDuration = nextActivities[0].startTime - time;
        } else {
          newDuration = 1440 - time; // Assuming 1440 as the end of the day
        }

        if (existingActivity) {
          const newExistingDuration = time - existingActivity.startTime;
          if (newExistingDuration > 0) {
            existingActivity.duration = newExistingDuration;
          } else {
            // Remove the existing activity if the new duration is not positive
            this.activities = this.activities.filter(
              (a) => a.id !== existingActivity.id,
            );
          }
        }
      }

      const fullNewActivity: Activity = {
        ...newActivity,
        id: this.nextId++,
        startTime: time,
        duration: newDuration,
      };
      this.activities.push(fullNewActivity);
      this.activities.sort((a, b) => a.startTime - b.startTime);
    },
  },
});
