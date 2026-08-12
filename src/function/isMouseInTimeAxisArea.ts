export function isMouseInTimeAxisArea(
  e: MouseEvent | TouchEvent,
  time_axis_area_rect: DOMRect,
): boolean {
  return (
    ((e as MouseEvent).clientX >= time_axis_area_rect.left &&
      (e as MouseEvent).clientX <= time_axis_area_rect.right) ||
    ((e as TouchEvent).touches &&
      (e as TouchEvent).touches[0].clientX >= time_axis_area_rect.left &&
      (e as TouchEvent).touches[0].clientX <= time_axis_area_rect.right)
  );
}
