export function updateActivityElementStyle(
  activityIndex: number,
  updates: { top?: number; height?: number },
) {
  const activityElement = document.querySelectorAll(".activity-item")[
    activityIndex
  ] as HTMLElement;
  if (activityElement) {
    if (updates.top !== undefined) {
      activityElement.style.top = `${updates.top}px`;
    }
    if (updates.height !== undefined) {
      activityElement.style.height = `${updates.height}px`;
    }
  }
}
