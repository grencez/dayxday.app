import { createRouter, createWebHashHistory } from "vue-router";
import DayView from "./view/DayView.vue";
import TagsView from "./view/TagsView.vue";

const routes = [
  { path: "/", name: "DayView", component: DayView },
  { path: "/tags", name: "TagsView", component: TagsView },
];

const router = createRouter({ history: createWebHashHistory(), routes });

export default router;
