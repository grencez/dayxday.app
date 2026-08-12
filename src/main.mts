import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./asset/style/main.css";
import router from "./router.mts";

const pinia = createPinia();

createApp(App).use(router).use(pinia).mount("#app");
