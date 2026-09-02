import { Component, OnInit, OnDestroy } from '@angular/core';
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
          <div class="flex items-center gap-3">
            <a routerLink="/" class="flex items-center gap-2.5 text-lg md:text-xl font-black text-primary-600 hover:text-primary-700 transition-colors">
              <img src="assets/logo.png" alt="Quiz Generator Logo" class="w-9 h-9 object-contain flex-shrink-0" />
              <span>{{ 'app.title' | translate }}</span>
            </a>

            <!-- PWA Offline Badge -->
            <span *ngIf="isOffline" class="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
              <span>📡</span>
              <span>Off-Line</span>
            </span>
            <span *ngIf="!isOffline" class="hidden sm:flex text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 items-center gap-1">
              <span>⚡</span>
              <span>Offline Ready</span>
            </span>
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
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span class="flex items-center gap-2">
            <img src="assets/logo.png" alt="Logo" class="w-5 h-5 object-contain" />
            <span>Excel Quiz Generator &copy; 2026 — 100% Client-Side Offline PWA</span>
          </span>
          <span class="text-emerald-700 font-semibold">🔒 0 Network Calls • 100% Device Local Processing</span>
        </div>
      </footer>
    </div>
  `,
  styles: []
})
export class LayoutComponent implements OnInit, OnDestroy {
  isOffline = !navigator.onLine;

  private onlineHandler = () => { this.isOffline = false; };
  private offlineHandler = () => { this.isOffline = true; };

  constructor(
    private languageService: LanguageService,
    private quizStateService: QuizStateService
  ) {}

  ngOnInit(): void {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  }

  get dir(): 'rtl' | 'ltr' {
    return this.languageService.dir;
  }

  clearData(): void {
    if (confirm('Are you sure you want to clear all data?')) {
      this.quizStateService.clearData();
    }
  }
}
