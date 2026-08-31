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

      <!-- Choice Columns -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">{{ 'mapping.choiceCols' | translate }}</label>
        <div class="space-y-2 border border-gray-200 rounded-md p-3 max-h-48 overflow-y-auto">
          <div *ngFor="let header of headers; let i = index" class="flex items-center">
            <input type="checkbox" [checked]="isChoiceSelected(i)" (change)="toggleChoice(i, $event)" [id]="'choice-'+i" class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded">
            <label [for]="'choice-'+i" class="ms-2 block text-sm text-gray-900 cursor-pointer">
              {{i}}: {{ header }}
            </label>
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

  isChoiceSelected(index: number): boolean {
    return this.mapping.choiceCols ? this.mapping.choiceCols.includes(index) : false;
  }

  toggleChoice(index: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const choiceCols = this.mapping.choiceCols ? [...this.mapping.choiceCols] : [];
    
    if (checked) {
      if (!choiceCols.includes(index)) {
        choiceCols.push(index);
      }
    } else {
      const idx = choiceCols.indexOf(index);
      if (idx > -1) {
        choiceCols.splice(idx, 1);
      }
    }
    
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
