import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { QuizStateService } from '../../services/quiz-state.service';
import { LanguageSwitchComponent } from '../language-switch/language-switch.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, LanguageSwitchComponent],
  template: `
    <div [dir]="dir" class="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <a routerLink="/" class="text-xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
              {{ 'app.title' | translate }}
            </a>
          </div>
          
          <div class="flex items-center gap-4">
            <button 
              (click)="clearData()" 
              class="text-xs text-red-500 hover:text-red-700 px-3 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors">
              {{ 'app.clearData' | translate }}
            </button>
            <app-language-switch></app-language-switch>
          </div>
        </div>
      </header>
      
      <main class="flex-grow max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <router-outlet></router-outlet>
      </main>
      
      <footer class="bg-white border-t border-gray-200 py-6 mt-auto">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          Excel Quiz Generator &copy; 2026 — Client-Side Local Quiz App
        </div>
      </footer>
    </div>
  `,
  styles: []
})
export class LayoutComponent {
  constructor(
    private languageService: LanguageService,
    private quizStateService: QuizStateService
  ) {}

  get dir(): 'rtl' | 'ltr' {
    return this.languageService.dir;
  }

  clearData(): void {
    if (confirm('Are you sure you want to clear all data?')) {
      this.quizStateService.clearData();
    }
  }
}
