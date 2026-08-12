import { computed } from "vue";

export function useTimeFormatter(hour: number) {
  const formattedTime = computed(() => {
    return String(hour % 24).padStart(2, "0") + ":00";
  });

  return { formattedTime };
}
