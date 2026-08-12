export function isMouseInTimeAxisArea(
  e: MouseEvent | TouchEvent,
  time_axis_area_rect: DOMRect,
): boolean {
  if ("touches" in e) {
    // Handle TouchEvent
    return (
      e.touches &&
      e.touches.length > 0 &&
      e.touches[0].clientX >= time_axis_area_rect.left &&
      e.touches[0].clientX <= time_axis_area_rect.right
    );
  } else {
    // Handle MouseEvent
    return (
      e.clientX >= time_axis_area_rect.left &&
      e.clientX <= time_axis_area_rect.right
    );
  }
}
