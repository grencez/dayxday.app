import { defineStore } from "pinia";
import { Activity } from "../model/Activity";

export const useActivityStore = defineStore("activities", {
  state: () => ({
    activities: [] as Activity[],
  }),
  getters: {
    getActivitiesForDay(state): Activity[] {
      return state.activities
        .filter(
          (activity) => activity.startTime >= 0 && activity.startTime <= 1440,
        )
        .sort((a, b) => a.startTime - b.startTime);
    },
  },
  actions: {
    async initializeActivities(initialActivities?: Activity[]) {
      if (initialActivities) {
        this.activities = initialActivities;
      } else {
        // Potentially initialize with an empty array or default values
        this.activities = [];
      }
    },
    async updateActivity(id: number, updates: Partial<Activity>) {
      const index = this.activities.findIndex((activity) => activity.id === id);
      if (index !== -1) {
        Object.assign(this.activities[index], updates);
      }
    },
  },
});
