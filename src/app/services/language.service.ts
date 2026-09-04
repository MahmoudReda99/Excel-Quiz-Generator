import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { en } from '../i18n/en';
import { ar } from '../i18n/ar';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLangSubject = new BehaviorSubject<'en' | 'ar'>('ar');
  currentLang$ = this.currentLangSubject.asObservable();
  
  private translations: Record<'en' | 'ar', any> = { en, ar };

  constructor(@Inject(DOCUMENT) private document: Document) {
    const savedLang = this.getSavedLanguage();
    this.setLanguage(savedLang);
  }

  private getSavedLanguage(): 'en' | 'ar' {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('app_language');
      if (saved === 'en' || saved === 'ar') {
        return saved;
      }
    }
    return 'ar';
  }

  setLanguage(lang: 'en' | 'ar'): void {
    this.currentLangSubject.next(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('app_language', lang);
    }
    if (this.document && this.document.documentElement) {
      this.document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      this.document.documentElement.lang = lang;
    }
  }

  getCurrentLang(): 'en' | 'ar' {
    return this.currentLangSubject.value;
  }

  get dir(): 'rtl' | 'ltr' {
    return this.getCurrentLang() === 'ar' ? 'rtl' : 'ltr';
  }

  translate(key: string): string {
    const lang = this.getCurrentLang();
    const keys = key.split('.');
    let value = this.translations[lang];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  }

  detectLanguageFromContent(text: string): 'en' | 'ar' {
    if (!text) return 'ar';
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text) ? 'ar' : 'en';
  }
}
