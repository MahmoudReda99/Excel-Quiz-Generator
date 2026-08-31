import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-file-info',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="bg-white shadow rounded-lg p-4 flex items-start space-x-4">
      <div class="flex-shrink-0">
        <svg class="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-900 truncate">{{ fileName }}</p>
        <p class="text-sm text-gray-500">{{ formatSize(fileSize) }} • {{ sheetCount }} sheets</p>
      </div>
      <div class="flex-shrink-0">
        <svg class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  `
})
export class FileInfoComponent {
  @Input() fileName: string = '';
  @Input() fileSize: number = 0;
  @Input() sheetCount: number = 0;
  @Input() sheetNames: string[] = [];

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
