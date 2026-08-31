import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuizSettingsComponent } from '../../components/quiz-settings/quiz-settings.component';
import { QuizStateService } from '../../services/quiz-state.service';
import { TimerService } from '../../services/timer.service';
import { QuizConfig } from '../../models/quiz.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, QuizSettingsComponent, TranslatePipe],
  template: `
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <h1 class="text-3xl font-bold text-gray-800 mb-8 text-center">{{ 'quiz_settings' | translate }}</h1>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <app-quiz-settings 
          *ngIf="totalQuestions > 0"
          [totalQuestions]="totalQuestions" 
          (startQuiz)="onStartQuiz($event)">
        </app-quiz-settings>
      </div>
    </div>
  `
})
export class SettingsPageComponent implements OnInit {
  totalQuestions: number = 0;

  constructor(
    private quizStateService: QuizStateService,
    private timerService: TimerService,
    private router: Router
  ) {}

  ngOnInit() {
    this.totalQuestions = this.quizStateService.getAvailableQuestionsCount();
    if (this.totalQuestions === 0) {
      this.router.navigate(['/']);
    }
  }

  onStartQuiz(config: QuizConfig) {
    this.quizStateService.configureQuiz(config);
    this.quizStateService.startQuiz();
    if (config.timerMinutes) {
      this.timerService.start(config.timerMinutes);
    }
    this.router.navigate(['/quiz']);
  }
}
