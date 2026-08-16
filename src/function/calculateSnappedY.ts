export function calculateSnappedY(
  clientY: number,
  timeMarkersRect: DOMRect,
): number {
  const snapInterval = 15; // 15 minutes = 15 pixels
  const offset = timeMarkersRect.top;
  const mouseY = clientY - offset;
  const nearestSnap = Math.round(mouseY / snapInterval);
  return nearestSnap * snapInterval + offset;
}
