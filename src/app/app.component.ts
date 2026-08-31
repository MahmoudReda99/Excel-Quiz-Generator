import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LayoutComponent } from './components/layout/layout.component';
import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, LayoutComponent],
  template: `<app-layout></app-layout>`,
  styles: []
})
export class AppComponent implements OnInit {
  constructor(private languageService: LanguageService) {}

  ngOnInit(): void {
    // Initialize default language
    this.languageService.setLanguage('en');
  }
}
