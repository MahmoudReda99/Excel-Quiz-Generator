import { Routes } from '@angular/router';
import { AnalysisComponent } from './pages/analysis/analysis.component';
import { HomeComponent } from './pages/home/home.component';
import { QuizPageComponent } from './pages/quiz/quiz.component';
import { ResultsPageComponent } from './pages/results/results.component';
import { ReviewPageComponent } from './pages/review/review.component';
import { SettingsPageComponent } from './pages/settings/settings.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'analysis',
    component: AnalysisComponent,
  },
  {
    path: 'settings',
    component: SettingsPageComponent,
  },
  {
    path: 'quiz',
    component: QuizPageComponent,
  },
  {
    path: 'results',
    component: ResultsPageComponent,
  },
  {
    path: 'review',
    component: ReviewPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
