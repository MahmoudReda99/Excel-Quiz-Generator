import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div 
      class="border-2 border-dashed rounded-lg p-10 text-center transition-colors"
      [class.border-blue-500]="isDragging"
      [class.bg-blue-50]="isDragging"
      [class.border-gray-300]="!isDragging"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p class="mt-4 text-sm text-gray-600">{{ 'upload.dragDrop' | translate }}</p>
      <div class="mt-6">
        <input
          type="file"
          #fileInput
          class="hidden"
          accept=".xlsx,.xls"
          (change)="onFileSelected($event)"
        />
        <button
          type="button"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          (click)="fileInput.click()"
        >
          {{ 'upload.chooseFile' | translate }}
        </button>
      </div>
    </div>
  `
})
export class FileUploadComponent {
  @Output() fileSelected = new EventEmitter<File>();
  isDragging = false;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        this.fileSelected.emit(file);
      }
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileSelected.emit(input.files[0]);
    }
  }
}
