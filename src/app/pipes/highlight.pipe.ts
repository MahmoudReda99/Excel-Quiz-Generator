import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined, query: string | null | undefined): SafeHtml {
    if (!value) return '';
    if (!query || !query.trim()) return value;

    const trimmedQuery = query.trim();
    const words = trimmedQuery
      .split(/\s+/)
      .filter(w => w.length > 0)
      .map(w => this.escapeRegExp(w));

    if (words.length === 0) return value;

    // Build flexible Arabic regex for each word (e.g. أ/ا/إ, ة/ه, ى/ي)
    const regexParts = words.map(w => this.buildArabicFlexPattern(w));
    const regex = new RegExp(`(${regexParts.join('|')})`, 'gi');

    // Escape raw value first to prevent XSS, then highlight matches
    const escapedValue = this.escapeHtml(value);
    const highlighted = escapedValue.replace(
      regex,
      '<mark class="bg-amber-200 text-amber-950 font-bold px-1 rounded mx-0.5">$1</mark>'
    );

    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private buildArabicFlexPattern(word: string): string {
    return word
      .replace(/[أإآٱا]/g, '[أإآٱا]')
      .replace(/[ةه]/g, '[ةه]')
      .replace(/[ىي]/g, '[ىي]');
  }
}
