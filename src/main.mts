import { createApp } from "vue";
import App from "./App.vue";
import "./asset/style/main.css";
import router from "./router.mts";

createApp(App).use(router).mount("#app");
