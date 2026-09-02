import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full space-y-1.5">
      <div class="flex justify-between items-center text-xs sm:text-sm font-bold text-gray-700">
        <span>{{ percentage }}%</span>
        <span dir="ltr" class="font-mono text-xs bg-primary-50 text-primary-800 border border-primary-200 px-2.5 py-0.5 rounded-md shadow-xs">
          {{ current }} / {{ total }}
        </span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
        <div 
          class="bg-primary-600 h-3 rounded-full transition-all duration-300 ease-out" 
          [style.width.%]="percentage">
        </div>
      </div>
    </div>
  `
})
export class ProgressBarComponent implements OnChanges {
  @Input() current: number = 0;
  @Input() total: number = 1;
  percentage: number = 0;

  ngOnChanges() {
    if (this.total > 0) {
      this.percentage = Math.round((this.current / this.total) * 100);
    }
  }
}
