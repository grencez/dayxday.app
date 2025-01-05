import { createRouter, createWebHistory } from "vue-router";
import DayView from "./asset/component/DayView.vue";

const routes = [
  {
    path: "/",
    name: "DayView",
    component: DayView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
