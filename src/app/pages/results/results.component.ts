import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuizStateService } from '../../services/quiz-state.service';
import { ResultDashboardComponent } from '../../components/result-dashboard/result-dashboard.component';
import { QuizResult } from '../../models/quiz.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-results-page',
  standalone: true,
  imports: [CommonModule, ResultDashboardComponent, TranslatePipe],
  template: `
    <div class="container mx-auto px-4 py-8">
      <app-result-dashboard
        *ngIf="result"
        [result]="result"
        (reviewAnswers)="onReview()"
        (retryQuiz)="onRetry()"
        (backHome)="onHome()"
        (newFile)="onNewFile()">
      </app-result-dashboard>
    </div>
  `
})
export class ResultsPageComponent implements OnInit {
  result!: QuizResult;

  constructor(
    private quizStateService: QuizStateService,
    private router: Router
  ) {}

  ngOnInit() {
    const state = this.quizStateService.getCurrentState();
    if (!state || !state.result) {
      this.router.navigate(['/']);
      return;
    }
    this.result = state.result;
  }

  onReview() {
    this.router.navigate(['/review']);
  }

  onRetry() {
    this.router.navigate(['/settings']);
  }

  onHome() {
    this.router.navigate(['/']);
  }

  onNewFile() {
    this.quizStateService.resetAll();
    this.router.navigate(['/']);
  }
}
