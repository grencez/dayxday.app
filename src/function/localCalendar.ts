import { getLocalDateString } from "./getLocalDateString";

export function getLocalMinuteOfDay(date = new Date()): number {
  return (
    date.getHours() * 60 +
    date.getMinutes() +
    date.getSeconds() / 60 +
    date.getMilliseconds() / 60_000
  );
}

export function getNextLocalMidnightMs(nowMs: number): number {
  const date = new Date(nowMs);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  ).getTime();
}

export function getLocalDayAtMs(nowMs: number): string {
  return getLocalDateString(new Date(nowMs));
}
