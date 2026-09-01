import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div 
      class="border-3 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all cursor-pointer bg-white shadow-sm hover:shadow-md hover:border-primary-400"
      [class.border-primary-500]="isDragging"
      [class.bg-primary-50]="isDragging"
      [class.border-gray-300]="!isDragging"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (click)="fileInput.click()"
    >
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center text-3xl">
        📁
      </div>
      
      <h3 class="text-xl font-bold text-gray-900 mb-1">
        {{ 'upload.dragDrop' | translate }}
      </h3>
      <p class="text-xs font-semibold text-gray-500 mb-4">
        (يمكنك إختيار أو سحب أكثر من ملف إكسل في نفس الوقت للدمج)
      </p>

      <div class="mt-4 inline-flex items-center gap-2">
        <input
          type="file"
          #fileInput
          class="hidden"
          multiple
          accept=".xlsx,.xls"
          (change)="onFileSelected($event)"
        />
        <button
          type="button"
          class="btn-primary py-3 px-6 text-sm font-bold shadow-md hover:shadow-lg transition-all"
        >
          {{ 'upload.chooseFile' | translate }}
        </button>
      </div>
    </div>
  `
})
export class FileUploadComponent {
  @Output() filesSelected = new EventEmitter<File[]>();
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
    
    const filesList = event.dataTransfer?.files;
    if (filesList && filesList.length > 0) {
      const validFiles: File[] = [];
      for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i];
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          validFiles.push(file);
        }
      }
      if (validFiles.length > 0) {
        this.filesSelected.emit(validFiles);
        this.fileSelected.emit(validFiles[0]);
      }
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const validFiles: File[] = [];
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          validFiles.push(file);
        }
      }
      if (validFiles.length > 0) {
        this.filesSelected.emit(validFiles);
        this.fileSelected.emit(validFiles[0]);
      }
    }
  }
}
