import { defineStore } from "pinia";
import { Activity } from "../model/Activity";
import { useActivityDatabase } from "../composable/useActivityDatabase";

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
      const { getActivities } = useActivityDatabase();
      if (initialActivities) {
        this.activities = initialActivities;
      } else {
        this.activities = getActivities();
      }
    },
    async updateActivity(id: number, updates: Partial<Activity>) {
      const { updateActivity } = useActivityDatabase();
      const index = this.activities.findIndex((activity) => activity.id === id);
      if (index !== -1) {
        Object.assign(this.activities[index], updates);
        updateActivity(id, updates);
      }
    },
  },
});
