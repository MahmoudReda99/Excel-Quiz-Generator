import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-language-switch',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="flex items-center gap-2 text-sm font-medium">
      <button 
        (click)="setLang('ar')"
        [class.text-primary-600]="isAr"
        [class.font-bold]="isAr"
        class="hover:text-primary-500 transition-colors">
        العربية
      </button>
      <span class="text-gray-300">|</span>
      <button 
        (click)="setLang('en')"
        [class.text-primary-600]="isEn"
        [class.font-bold]="isEn"
        class="hover:text-primary-500 transition-colors">
        English
      </button>
    </div>
  `
})
export class LanguageSwitchComponent {
  constructor(public languageService: LanguageService) {}

  get isAr(): boolean {
    return this.languageService.getCurrentLang() === 'ar';
  }

  get isEn(): boolean {
    return this.languageService.getCurrentLang() === 'en';
  }

  setLang(lang: 'ar' | 'en'): void {
    this.languageService.setLanguage(lang);
  }
}
