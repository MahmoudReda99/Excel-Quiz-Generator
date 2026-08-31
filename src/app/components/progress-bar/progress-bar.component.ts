import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <div class="flex justify-between items-center mb-1 text-sm font-medium text-gray-700">
        <span>{{ current }} / {{ total }}</span>
        <span>{{ percentage }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          class="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
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
