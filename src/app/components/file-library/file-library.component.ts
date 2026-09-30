import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppStorageService } from '../../services/app-storage.service';
import { QuizStateService } from '../../services/quiz-state.service';
import { SavedFileSummary, SavedQuizSession, StorageUsage, SupportedFileType } from '../../models/storage.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-file-library',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="w-full space-y-6">
      <!-- Active In-Progress Quiz Session Alert Banner -->
      <div 
        *ngIf="activeSession" 
        class="bg-gradient-to-r from-primary-600 to-indigo-700 text-white p-5 rounded-3xl shadow-lg border border-primary-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
        <div class="flex items-center gap-3.5 text-center sm:text-start">
          <span class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl flex-shrink-0">
            ⏱️
          </span>
          <div>
            <div class="flex items-center gap-2 justify-center sm:justify-start">
              <span class="text-xs uppercase tracking-wider font-extrabold bg-amber-400 text-amber-950 px-2.5 py-0.5 rounded-full">
                جلسة غير مكتملة
              </span>
              <span class="text-xs text-white/80">
                {{ formatRelativeTime(activeSession.updatedAt) }}
              </span>
            </div>
            <h4 class="text-base font-black mt-1 line-clamp-1">
              {{ activeSession.fileName }}
            </h4>
            <p class="text-xs text-white/80 font-medium">
              وصلت إلى السؤال رقم {{ (activeSession.quizState.currentIndex || 0) + 1 }} من إجمالي {{ activeSession.quizState.questions.length }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto">
          <button
            (click)="resumeActiveSession()"
            class="flex-1 sm:flex-none px-6 py-2.5 bg-white text-primary-900 hover:bg-gray-50 rounded-xl text-xs font-black shadow-md hover:shadow-xl transition-all flex items-center justify-center gap-1.5">
            <span>▶️</span>
            <span>استئناف الاختبار</span>
          </button>
          <button
            (click)="dismissActiveSession()"
            class="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
            title="تجاهل الجلسة">
            ✕
          </button>
        </div>
      </div>

      <!-- Saved Library Card -->
      <div class="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <!-- Header -->
        <div class="p-6 pb-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center text-xl flex-shrink-0">
              📚
            </span>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-black text-gray-900">
                  مكتبة ملفاتي المحفوظة
                </h3>
                <span class="px-2.5 py-0.5 text-xs font-black rounded-full bg-primary-100 text-primary-800">
                  {{ savedFiles.length }}
                </span>
              </div>
            </div>
          </div>

          <!-- Filter & Storage Usage Badge -->
          <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            <div *ngIf="storageUsage.usedBytes > 0" class="text-[11px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <span>💾</span>
              <span>المساحة: {{ formatSize(storageUsage.usedBytes) }}</span>
            </div>

            <button
              *ngIf="savedFiles.length > 0"
              (click)="confirmClearAll()"
              class="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition-all">
              مسح الكل
            </button>
          </div>
        </div>

        <!-- Filter Chips & Search -->
        <div *ngIf="savedFiles.length > 0" class="px-6 py-3 bg-gray-50/70 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <!-- Search input -->
          <div class="relative flex-1">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="ابحث في الملفات المحفوظة بالاسم..."
              class="w-full ps-9 pe-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-gray-400"
            />
            <span class="absolute start-3 top-2.5 text-gray-400 text-xs">🔍</span>
          </div>

          <!-- Type filter buttons -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              *ngFor="let filter of filterOptions"
              (click)="selectedFilter = filter.value"
              [class.bg-primary-600]="selectedFilter === filter.value"
              [class.text-white]="selectedFilter === filter.value"
              [class.bg-white]="selectedFilter !== filter.value"
              [class.text-gray-600]="selectedFilter !== filter.value"
              class="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold whitespace-nowrap transition-all shadow-2xs hover:bg-gray-100"
              [class.hover:bg-primary-700]="selectedFilter === filter.value">
              <span>{{ filter.icon }}</span>
              <span class="ms-1">{{ filter.label }}</span>
            </button>
          </div>
        </div>

        <!-- Saved Files List -->
        <div *ngIf="filteredFiles.length > 0; else emptyState" class="p-6 divide-y divide-gray-100 max-h-96 overflow-y-auto">
          <div 
            *ngFor="let file of filteredFiles" 
            class="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-gray-50/80 -mx-3 px-3 rounded-2xl transition-all">
            
            <!-- File Info -->
            <div class="flex items-start gap-3 min-w-0">
              <span class="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-2xs border"
                [ngClass]="{
                  'bg-rose-50 text-rose-600 border-rose-200': file.fileType === 'pdf',
                  'bg-emerald-50 text-emerald-600 border-emerald-200': file.fileType === 'excel',
                  'bg-purple-50 text-purple-600 border-purple-200': file.fileType === 'markdown' || file.fileType === 'text'
                }">
                {{ file.fileType === 'pdf' ? '📕' : (file.fileType === 'markdown' ? '📝' : '📊') }}
              </span>

              <div class="min-w-0">
                <h4 class="text-sm font-black text-gray-900 truncate leading-snug" [title]="file.name">
                  {{ file.name }}
                </h4>
                <div class="flex items-center gap-2 text-xs text-gray-500 font-semibold mt-1 flex-wrap">
                  <span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-bold text-[11px]">
                    {{ file.questionCount }} سؤال
                  </span>
                  <span>•</span>
                  <span>{{ formatSize(file.fileSize) }}</span>
                  <span>•</span>
                  <span class="text-gray-400 font-normal">{{ formatRelativeTime(file.uploadedAt) }}</span>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
              <!-- Load & Start Quiz or Continue Exam -->
              <button
                (click)="isSessionActiveFor(file) ? resumeActiveSession() : loadAndStart(file.id)"
                [disabled]="loadingFileId === file.id"
                class="px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                [ngClass]="isSessionActiveFor(file) ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300' : 'btn-primary'">
                <span>{{ loadingFileId === file.id ? '⏳' : (isSessionActiveFor(file) ? '▶️' : '⚡') }}</span>
                <span>{{ loadingFileId === file.id ? 'جاري التحميل...' : (isSessionActiveFor(file) ? 'متابعة الاختبار' : 'بدء الاختبار') }}</span>
              </button>

              <!-- Restart from scratch if session active -->
              <button
                *ngIf="isSessionActiveFor(file)"
                (click)="loadAndStart(file.id)"
                class="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition-all"
                title="إعادة البدء من جديد من السؤال الأول">
                🔄
              </button>

              <!-- Download original blob -->
              <button
                (click)="downloadFile(file.id)"
                class="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all"
                title="تنزيل الملف">
                📥
              </button>

              <!-- Delete -->
              <button
                (click)="deleteFile(file.id, file.name)"
                class="p-2 rounded-xl bg-gray-100 hover:bg-rose-100 hover:text-rose-600 text-gray-400 text-xs font-bold transition-all"
                title="حذف من الذاكرة">
                🗑️
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <ng-template #emptyState>
          <div class="py-12 px-6 text-center">
            <div class="w-16 h-16 rounded-3xl bg-gray-100 text-gray-400 flex items-center justify-center text-3xl mx-auto mb-3">
              📂
            </div>
            <h4 class="text-base font-black text-gray-800">
              {{ searchQuery ? 'لم يتم العثور على نتائج للبحث' : 'لا توجد ملفات محفوظة بعد' }}
            </h4>
            <p class="text-xs text-gray-500 font-medium max-w-sm mx-auto mt-1">
              {{ searchQuery ? 'جرب البحث بكلمة أخرى أو مسح الفلتر' : 'عندما ترفع أي ملف أسئلة (PDF أو Excel أو Markdown)، سيتم حفظه تلقائياً هنا لتتمكن من فتحه في أي وقت بضغطة واحدة.' }}
            </p>
          </div>
        </ng-template>
      </div>
    </div>
  `
})
export class FileLibraryComponent implements OnInit {
  private storageService = inject(AppStorageService);
  private quizState = inject(QuizStateService);
  private router = inject(Router);

  @Output() fileLoaded = new EventEmitter<void>();

  savedFiles: SavedFileSummary[] = [];
  activeSession: SavedQuizSession | null = null;
  storageUsage: StorageUsage = { usedBytes: 0, quotaBytes: 0, percentUsed: 0 };
  
  loadingFileId: string | null = null;
  searchQuery = '';
  selectedFilter: 'all' | SupportedFileType = 'all';

  filterOptions: Array<{ label: string; value: 'all' | SupportedFileType; icon: string }> = [
    { label: 'الكل', value: 'all', icon: '✨' },
    { label: 'PDF', value: 'pdf', icon: '📕' },
    { label: 'Excel', value: 'excel', icon: '📊' },
    { label: 'Markdown', value: 'markdown', icon: '📝' }
  ];

  async ngOnInit() {
    this.storageService.savedFiles$.subscribe(files => {
      this.savedFiles = files;
    });

    this.storageService.activeSession$.subscribe(session => {
      this.activeSession = session;
    });

    await this.storageService.refreshSavedFilesList();
    await this.storageService.loadActiveSession();
    await this.updateStorageUsage();
  }

  get filteredFiles(): SavedFileSummary[] {
    return this.savedFiles.filter(f => {
      const matchesSearch = !this.searchQuery || f.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesFilter = this.selectedFilter === 'all' || f.fileType === this.selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }

  isSessionActiveFor(file: SavedFileSummary): boolean {
    if (!this.activeSession || !this.activeSession.quizState || this.activeSession.quizState.status !== 'active') {
      return false;
    }
    if (this.activeSession.fileId && file.id && this.activeSession.fileId === file.id) {
      return true;
    }
    if (this.activeSession.fileName && file.name) {
      const normActive = this.activeSession.fileName.trim().toLowerCase().replace(/\.(pdf|xlsx|xls|md|markdown|txt)$/i, '');
      const normFile = file.name.trim().toLowerCase().replace(/\.(pdf|xlsx|xls|md|markdown|txt)$/i, '');
      if (normActive === normFile || this.activeSession.fileName.trim() === file.name.trim()) {
        return true;
      }
    }
    return false;
  }

  async updateStorageUsage() {
    this.storageUsage = await this.storageService.getStorageUsage();
  }

  async loadAndStart(fileId: string) {
    this.loadingFileId = fileId;
    try {
      const record = await this.storageService.getSavedFileById(fileId);
      if (!record || !record.excelData) {
        throw new Error('الملف غير موجود في الذاكرة أو تالف.');
      }

      // Populate quiz state
      this.quizState.setExcelData(record.excelData);
      
      // If questions are already cached, set validated questions directly
      if (record.questions && record.questions.length > 0) {
        this.quizState.setValidatedQuestions(record.questions);
      }

      this.fileLoaded.emit();
      await this.router.navigate(['/analysis']);
    } catch (err) {
      console.error('Error loading saved file:', err);
      alert('حدث خطأ أثناء تحميل الملف من الذاكرة.');
    } finally {
      this.loadingFileId = null;
    }
  }

  async downloadFile(fileId: string) {
    const record = await this.storageService.getSavedFileById(fileId);
    if (record) {
      this.storageService.downloadFileBlob(record);
    }
  }

  async deleteFile(fileId: string, fileName: string) {
    if (confirm(`هل أنت متأكد من حذف "${fileName}" من الذاكرة المحلية؟`)) {
      await this.storageService.deleteSavedFile(fileId);
      await this.updateStorageUsage();
    }
  }

  async confirmClearAll() {
    if (confirm('هل أنت متأكد من مسح جميع الملفات المحفوظة من ذاكرة المتصفح؟ لا يمكن التراجع عن هذه الخطوة.')) {
      await this.storageService.clearAllSavedFiles();
      await this.updateStorageUsage();
    }
  }

  async resumeActiveSession() {
    if (!this.activeSession) return;
    const session = this.activeSession;
    const state = session.quizState;
    if (session.fileName) {
      this.quizState.setActiveFileName(session.fileName);
    }
    this.quizState.setQuestions(state.questions);
    this.quizState.setValidatedQuestions(state.questions);
    this.quizState.quizConfig$.next(state.config);
    this.quizState.quizState$.next(state);
    await this.router.navigate(['/quiz']);
  }

  async dismissActiveSession() {
    await this.storageService.clearActiveSession();
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatRelativeTime(isoDate: string): string {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 30) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString('ar-EG');
  }
}
