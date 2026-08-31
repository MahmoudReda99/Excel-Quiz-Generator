import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimerService } from '../../services/timer.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="text-2xl font-mono font-bold tracking-wider transition-colors duration-300"
      [class.text-red-600]="isLowTime"
      [class.animate-pulse]="isVeryLowTime">
      {{ formattedTime }}
    </div>
  `
})
export class TimerComponent implements OnInit, OnDestroy {
  formattedTime: string = '00:00:00';
  isLowTime: boolean = false;
  isVeryLowTime: boolean = false;
  private sub?: Subscription;
  private rawTimeSub?: Subscription;

  constructor(private timerService: TimerService) {}

  ngOnInit() {
    this.sub = this.timerService.getFormattedTime$().subscribe((time: string) => {
      this.formattedTime = time;
    });
    this.rawTimeSub = this.timerService.remainingSeconds$.subscribe((seconds: number) => {
      this.isLowTime = seconds <= 60;
      this.isVeryLowTime = seconds <= 30 && seconds > 0;
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.rawTimeSub?.unsubscribe();
  }
}
