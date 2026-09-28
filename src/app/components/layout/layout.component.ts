import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { QuizStateService } from '../../services/quiz-state.service';
import { PwaUpdateService } from '../../services/pwa-update.service';
import { LanguageSwitchComponent } from '../language-switch/language-switch.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, LanguageSwitchComponent],
  template: `
    <div [dir]="dir" class="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 relative">
      <!-- PWA Update Available Floating Notification -->
      <div 
        *ngIf="pwaUpdateService.isUpdateAvailable$ | async" 
        class="fixed top-3 start-4 end-4 sm:start-auto sm:end-auto sm:left-1/2 sm:-translate-x-1/2 z-50 max-w-xl bg-gradient-to-r from-primary-900 to-indigo-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-primary-400/40 flex items-center justify-between gap-3 sm:gap-4 animate-fadeIn">
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <span class="text-2xl flex-shrink-0 animate-spin text-primary-300">🔄</span>
          <div class="min-w-0">
            <h4 class="font-extrabold text-xs sm:text-sm text-white leading-tight">
              {{ 'pwa.updateAvailable' | translate }}
            </h4>
            <p class="text-[11px] sm:text-xs text-primary-200 truncate mt-0.5">
              {{ 'pwa.updateDesc' | translate }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button 
            type="button"
            (click)="updateApp()"
            [disabled]="pwaUpdateService.isUpdating$ | async"
            class="px-3 sm:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer">
            <span *ngIf="pwaUpdateService.isUpdating$ | async" class="animate-spin text-xs">⏳</span>
            <span *ngIf="pwaUpdateService.isUpdating$ | async">{{ 'pwa.updating' | translate }}</span>
            <span *ngIf="!(pwaUpdateService.isUpdating$ | async)">{{ 'pwa.updateNow' | translate }}</span>
          </button>

          <button 
            type="button"
            (click)="dismissUpdate()"
            class="p-1.5 text-primary-200 hover:text-white rounded-lg hover:bg-white/10 text-xs font-bold transition-all"
            title="Dismiss">
            ✕
          </button>
        </div>
      </div>

      <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <a routerLink="/" class="flex items-center gap-2.5 text-lg md:text-xl font-black text-primary-600 hover:text-primary-700 transition-colors">
              <img src="assets/logo.png" alt="Quiz Generator Logo" class="w-9 h-9 object-contain flex-shrink-0" />
              <span>{{ 'app.title' | translate }}</span>
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
    private quizStateService: QuizStateService,
    public pwaUpdateService: PwaUpdateService
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

  updateApp(): void {
    this.pwaUpdateService.activateUpdate();
  }

  dismissUpdate(): void {
    this.pwaUpdateService.dismissBanner();
  }

  clearData(): void {
    if (confirm('Are you sure you want to clear all data?')) {
      this.quizStateService.clearData();
    }
  }
}
