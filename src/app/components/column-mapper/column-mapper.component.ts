import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ColumnMapping } from '../../models/excel.model';

@Component({
  selector: 'app-column-mapper',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="bg-white shadow rounded-lg p-6 space-y-6">
      <h3 class="text-lg font-medium text-gray-900">{{ 'mapping.title' | translate }}</h3>
      
      <!-- Question Column -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ 'mapping.questionCol' | translate }}</label>
        <select [(ngModel)]="mapping.questionCol" (ngModelChange)="emitChange()" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border">
          <option [ngValue]="null">-- Select --</option>
          <option *ngFor="let header of headers; let i = index" [ngValue]="i">{{i}}: {{ header }}</option>
        </select>
      </div>

      <!-- Choice Columns (Option A, B, C, D) -->
      <div class="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50/50">
        <label class="block text-sm font-bold text-gray-900">{{ 'mapping.choiceCols' | translate }}</label>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Option A -->
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">{{ 'mapping.optionA' | translate }}</label>
            <select [ngModel]="optionACol" (ngModelChange)="updateOptionCol(0, $event)" class="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md border bg-white">
              <option [ngValue]="null">-- {{ 'common.off' | translate }} / None --</option>
              <option *ngFor="let header of headers; let i = index" [ngValue]="i">{{i}}: {{ header }}</option>
            </select>
          </div>

          <!-- Option B -->
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">{{ 'mapping.optionB' | translate }}</label>
            <select [ngModel]="optionBCol" (ngModelChange)="updateOptionCol(1, $event)" class="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md border bg-white">
              <option [ngValue]="null">-- {{ 'common.off' | translate }} / None --</option>
              <option *ngFor="let header of headers; let i = index" [ngValue]="i">{{i}}: {{ header }}</option>
            </select>
          </div>

          <!-- Option C -->
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">{{ 'mapping.optionC' | translate }}</label>
            <select [ngModel]="optionCCol" (ngModelChange)="updateOptionCol(2, $event)" class="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md border bg-white">
              <option [ngValue]="null">-- {{ 'common.off' | translate }} / None --</option>
              <option *ngFor="let header of headers; let i = index" [ngValue]="i">{{i}}: {{ header }}</option>
            </select>
          </div>

          <!-- Option D -->
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">{{ 'mapping.optionD' | translate }}</label>
            <select [ngModel]="optionDCol" (ngModelChange)="updateOptionCol(3, $event)" class="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md border bg-white">
              <option [ngValue]="null">-- {{ 'common.off' | translate }} / None --</option>
              <option *ngFor="let header of headers; let i = index" [ngValue]="i">{{i}}: {{ header }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Correct Answer Column -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ 'mapping.correctAnswer' | translate }}</label>
        <select [(ngModel)]="mapping.correctAnswerCol" (ngModelChange)="emitChange()" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border">
          <option [ngValue]="null">-- Select --</option>
          <option *ngFor="let header of headers; let i = index" [ngValue]="i">{{i}}: {{ header }}</option>
        </select>
      </div>
      
      <!-- Type Column -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ 'mapping.typecol' | translate }}</label>
        <select [(ngModel)]="mapping.typeCol" (ngModelChange)="emitChange()" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border">
          <option [ngValue]="null">-- Select (Optional) --</option>
          <option *ngFor="let header of headers; let i = index" [ngValue]="i">{{i}}: {{ header }}</option>
        </select>
      </div>

      <!-- Explanation Column -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ 'mapping.explanation' | translate }}</label>
        <select [(ngModel)]="mapping.explanationCol" (ngModelChange)="emitChange()" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border">
          <option [ngValue]="null">-- Select (Optional) --</option>
          <option *ngFor="let header of headers; let i = index" [ngValue]="i">{{i}}: {{ header }}</option>
        </select>
      </div>
    </div>
  `
})
export class ColumnMapperComponent {
  @Input() headers: string[] = [];
  @Input() mapping: ColumnMapping = {
    questionCol: null,
    choiceCols: [],
    correctAnswerCol: null,
    typeCol: null,
    explanationCol: null,
    difficultyCol: null
  };
  @Output() mappingChanged = new EventEmitter<ColumnMapping>();

  get optionACol(): number | null {
    return this.mapping.choiceCols && this.mapping.choiceCols[0] !== undefined ? this.mapping.choiceCols[0] : null;
  }

  get optionBCol(): number | null {
    return this.mapping.choiceCols && this.mapping.choiceCols[1] !== undefined ? this.mapping.choiceCols[1] : null;
  }

  get optionCCol(): number | null {
    return this.mapping.choiceCols && this.mapping.choiceCols[2] !== undefined ? this.mapping.choiceCols[2] : null;
  }

  get optionDCol(): number | null {
    return this.mapping.choiceCols && this.mapping.choiceCols[3] !== undefined ? this.mapping.choiceCols[3] : null;
  }

  updateOptionCol(slotIndex: number, colIndexVal: any) {
    const colIndex = (colIndexVal === null || colIndexVal === 'null' || colIndexVal === undefined) ? null : Number(colIndexVal);

    const slots: (number | null)[] = [
      this.optionACol,
      this.optionBCol,
      this.optionCCol,
      this.optionDCol
    ];

    slots[slotIndex] = (colIndex !== null && !isNaN(colIndex)) ? colIndex : null;

    const choiceCols: number[] = slots.filter((val): val is number => val !== null && val !== undefined && val >= 0);

    this.mapping = {
      ...this.mapping,
      choiceCols
    };
    this.emitChange();
  }

  emitChange() {
    this.mappingChanged.emit({ ...this.mapping });
  }
}
