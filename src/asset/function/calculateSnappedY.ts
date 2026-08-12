import { Ref } from "vue";

export function calculateSnappedY(
  clientY: number,
  timeMarkersRect: DOMRect,
): number {
  const hourHeight = 60;
  const offset = timeMarkersRect.top;
  const mouseY = clientY - offset;
  const nearestHour = Math.round(mouseY / hourHeight);
  return nearestHour * hourHeight + offset;
}
