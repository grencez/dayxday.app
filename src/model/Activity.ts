export class Activity {
  id: number;
  name: string;
  startTime: number;
  duration: number;

  constructor(id: number, name: string, startTime: number, duration: number) {
    this.id = id;
    this.name = name;
    this.startTime = startTime;
    this.duration = duration;
  }

  get endTime(): number {
    return this.startTime + this.duration;
  }

  setEndTime(endTime: number): void {
    this.duration = endTime - this.startTime;
  }
}
