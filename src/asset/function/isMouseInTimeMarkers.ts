export function isMouseInTimeMarkers(
  e: MouseEvent | TouchEvent,
  timeMarkersRect: DOMRect,
): boolean {
  return (
    ((e as MouseEvent).clientX >= timeMarkersRect.left &&
      (e as MouseEvent).clientX <= timeMarkersRect.right) ||
    ((e as TouchEvent).touches &&
      (e as TouchEvent).touches[0].clientX >= timeMarkersRect.left &&
      (e as TouchEvent).touches[0].clientX <= timeMarkersRect.right)
  );
}
