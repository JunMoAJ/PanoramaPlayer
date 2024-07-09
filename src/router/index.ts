import { createRouter, createWebHistory } from "vue-router";
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "video",
      component: () => import("../views/video/index.vue"),
    }
  ],
});

export default router;
