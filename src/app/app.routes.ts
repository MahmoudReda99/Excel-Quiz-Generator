import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'analysis',
    loadComponent: () => import('./pages/analysis/analysis.component').then(m => m.AnalysisComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsPageComponent),
  },
  {
    path: 'quiz',
    loadComponent: () => import('./pages/quiz/quiz.component').then(m => m.QuizPageComponent),
  },
  {
    path: 'results',
    loadComponent: () => import('./pages/results/results.component').then(m => m.ResultsPageComponent),
  },
  {
    path: 'review',
    loadComponent: () => import('./pages/review/review.component').then(m => m.ReviewPageComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
