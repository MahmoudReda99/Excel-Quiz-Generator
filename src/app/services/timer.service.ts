import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Observable, Subscription } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TimerService {
  private remainingSecondsSubj = new BehaviorSubject<number>(0);
  public remainingSeconds$ = this.remainingSecondsSubj.asObservable();
  
  private isRunningSubj = new BehaviorSubject<boolean>(false);
  public isRunning$ = this.isRunningSubj.asObservable();
  
  private isExpiredSubj = new BehaviorSubject<boolean>(false);
  public isExpired$ = this.isExpiredSubj.asObservable();
  
  private timerSubscription: Subscription | null = null;

  start(minutes: number): void {
    this.stop();
    this.remainingSecondsSubj.next(minutes * 60);
    this.isExpiredSubj.next(false);
    this.isRunningSubj.next(true);

    this.timerSubscription = interval(1000)
      .pipe(takeWhile(() => this.remainingSecondsSubj.value > 0))
      .subscribe({
        next: () => {
          this.remainingSecondsSubj.next(this.remainingSecondsSubj.value - 1);
        },
        complete: () => {
          this.isExpiredSubj.next(true);
          this.isRunningSubj.next(false);
        }
      });
  }

  stop(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
    this.isRunningSubj.next(false);
    this.isExpiredSubj.next(false);
  }

  pause(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
    this.isRunningSubj.next(false);
  }

  resume(): void {
    if (!this.isRunningSubj.value && this.remainingSecondsSubj.value > 0 && !this.isExpiredSubj.value) {
      this.isRunningSubj.next(true);
      this.timerSubscription = interval(1000)
        .pipe(takeWhile(() => this.remainingSecondsSubj.value > 0))
        .subscribe({
          next: () => {
            this.remainingSecondsSubj.next(this.remainingSecondsSubj.value - 1);
          },
          complete: () => {
            this.isExpiredSubj.next(true);
            this.isRunningSubj.next(false);
          }
        });
    }
  }

  reset(): void {
    this.stop();
    this.remainingSecondsSubj.next(0);
    this.isExpiredSubj.next(false);
  }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s]
      .map(v => v < 10 ? '0' + v : v)
      .filter((v, i) => v !== '00' || i > 0)
      .join(':');
  }

  getFormattedTime$(): Observable<string> {
    return this.remainingSeconds$.pipe(
      map(seconds => this.formatTime(seconds))
    );
  }

  // Aliases for consistency across components
  get timerExpired$(): Observable<boolean> {
    return this.isExpired$.pipe(
      map(expired => expired)
    );
  }

  startTimer(seconds: number): void {
    this.start(seconds / 60);
  }

  stopTimer(): void {
    this.stop();
  }
}
