import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiaryService, DiaryEntry } from '../../core/services/diary.service';

@Component({
  selector: 'app-diary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="diary-container animate-fade-in">
      <div class="diary-header">
        <div>
          <h1>Diary & Sentiment Analysis</h1>
          <p class="text-secondary">Journal your thoughts and get automated AI feedback</p>
        </div>
        <button class="btn btn-primary toggle-compose-btn" (click)="toggleCompose()">
          {{ showCompose ? 'View Entries' : 'Write Entry' }}
        </button>
      </div>

      <div class="diary-layout">
        <!-- List Panel (Active when not writing on mobile, always visible on desktop) -->
        <div class="main-panel" [class.hidden-mobile]="showCompose">
          <!-- Filters Bar -->
          <div class="glass-card filters-card">
            <h3>Filters</h3>
            <div class="filters-grid">
              <div class="filter-group">
                <label>Sentiment</label>
                <select [(ngModel)]="filterSentiment" (change)="onFilterChange()">
                  <option value="">All</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </div>
              <div class="filter-group">
                <label>Category</label>
                <input 
                  type="text" 
                  placeholder="e.g. Work, Family" 
                  [(ngModel)]="filterCategory" 
                  (input)="onFilterChange()">
              </div>
              <div class="filter-group">
                <label>Keyword Tag</label>
                <input 
                  type="text" 
                  placeholder="Filter by keyword" 
                  [(ngModel)]="filterKeyword" 
                  (input)="onFilterChange()">
              </div>
            </div>
          </div>

          <!-- Entries List -->
          <div class="entries-list">
            <div *ngIf="isLoading" class="state-indicator">
              <span class="loader"></span>
              <p>Loading entries...</p>
            </div>
            
            <div *ngIf="!isLoading && entries.length === 0" class="empty-state glass-card">
              <h3>No journal entries found</h3>
              <p class="text-secondary">Start typing in the compose panel to add your first entry.</p>
            </div>

            <div *ngFor="let entry of entries" class="glass-card entry-card animate-slide-up">
              <div class="entry-card-header">
                <div>
                  <h2>{{ entry.title || 'Untitled Entry' }}</h2>
                  <span class="date">{{ entry.entry_date | date:'EEEE, MMM d, y' }}</span>
                </div>
                <button class="delete-btn" (click)="deleteEntry(entry.id)" title="Delete entry">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
              
              <p class="entry-content">{{ entry.content }}</p>
              
              <!-- NLP Analysis Display -->
              <div class="analysis-section" *ngIf="entry.analysis">
                <div class="analysis-title">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  <span>AI Entry Insights</span>
                </div>
                
                <div class="analysis-meta">
                  <div class="meta-item" *ngIf="entry.analysis.sentiment">
                    <span class="label">Sentiment</span>
                    <span class="pill" 
                          [class.pill-green]="entry.analysis.sentiment === 'positive'"
                          [class.pill-cyan]="entry.analysis.sentiment === 'neutral'"
                          [class.pill-danger]="entry.analysis.sentiment === 'negative'">
                      {{ entry.analysis.sentiment | uppercase }} 
                      <span *ngIf="entry.analysis.sentiment_score !== undefined">
                        ({{ entry.analysis.sentiment_score | percent }})
                      </span>
                    </span>
                  </div>
                  
                  <div class="meta-item" *ngIf="entry.analysis.classification_category">
                    <span class="label">Classification</span>
                    <span class="pill pill-cyan">{{ entry.analysis.classification_category }}</span>
                  </div>
                </div>

                <div class="keywords-list" *ngIf="entry.analysis.keywords && entry.analysis.keywords.length > 0">
                  <span *ngFor="let word of entry.analysis.keywords" class="keyword-pill">
                    #{{ word }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Compose Side Panel (Collapsible on mobile) -->
        <div class="side-panel" [class.visible-mobile]="showCompose">
          <div class="glass-card compose-card">
            <h2>Compose Entry</h2>
            <form (ngSubmit)="saveEntry()" #entryForm="ngForm" class="compose-form">
              <div class="form-group">
                <label for="title">Title (Optional)</label>
                <input 
                  type="text" 
                  id="title" 
                  name="title" 
                  [(ngModel)]="newTitle" 
                  placeholder="A productive day coding">
              </div>

              <div class="form-group">
                <label for="date">Date</label>
                <input 
                  type="date" 
                  id="date" 
                  name="date" 
                  [(ngModel)]="newDate" 
                  required>
              </div>

              <div class="form-group">
                <label for="content">What's on your mind?</label>
                <textarea 
                  id="content" 
                  name="content" 
                  [(ngModel)]="newContent" 
                  required 
                  rows="10" 
                  placeholder="Today, I successfully completed..."></textarea>
              </div>

              <button type="submit" [disabled]="!entryForm.valid || isSaving" class="btn btn-primary w-full">
                <span *ngIf="!isSaving">Save and Analyze</span>
                <span *ngIf="isSaving" class="loader"></span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .diary-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .diary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .toggle-compose-btn {
      display: none;
    }

    .diary-layout {
      display: grid;
      grid-template-columns: 1.6fr 1fr;
      gap: 24px;
      align-items: start;
    }

    .main-panel {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .filters-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
    }

    .entries-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .entry-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .entry-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      padding-bottom: 12px;
    }

    .entry-card-header h2 {
      font-size: 1.3rem;
      font-weight: 700;
    }

    .entry-card-header .date {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 2px;
      display: block;
    }

    .delete-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      transition: var(--transition-fast);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .delete-btn:hover {
      color: var(--accent-danger);
      background: var(--accent-danger-glow);
    }

    .entry-content {
      font-size: 0.95rem;
      color: var(--text-secondary);
      line-height: 1.7;
      white-space: pre-wrap;
    }

    .analysis-section {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .analysis-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--accent-cyan);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .analysis-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .meta-item .label {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .keywords-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .keyword-pill {
      font-size: 0.75rem;
      color: var(--text-muted);
      background: rgba(255,255,255,0.04);
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 500;
    }

    /* Side Panel Form */
    .side-panel {
      position: sticky;
      top: 24px;
    }

    .compose-card {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .compose-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .w-full {
      width: 100%;
    }

    .state-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px;
      color: var(--text-secondary);
    }

    .loader {
      width: 28px;
      height: 28px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: var(--accent-cyan);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Mobile Responsive styling */
    @media (max-width: 768px) {
      .toggle-compose-btn {
        display: block;
      }

      .diary-layout {
        grid-template-columns: 1fr;
      }

      .filters-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .side-panel {
        display: none;
      }

      .side-panel.visible-mobile {
        display: block;
        position: static;
      }

      .main-panel.hidden-mobile {
        display: none;
      }
    }
  `]
})
export class DiaryComponent implements OnInit {
  private diaryService = inject(DiaryService);

  entries: DiaryEntry[] = [];
  isLoading = false;
  showCompose = false;

  // Form Fields
  newTitle = '';
  newContent = '';
  newDate = new Date().toISOString().substring(0, 10);
  isSaving = false;

  // Filter Fields
  filterSentiment = '';
  filterCategory = '';
  filterKeyword = '';

  ngOnInit() {
    this.loadEntries();
  }

  loadEntries() {
    this.isLoading = true;
    this.diaryService.getEntries({
      sentiment: this.filterSentiment || undefined,
      category: this.filterCategory || undefined,
      keyword: this.filterKeyword || undefined
    }).subscribe({
      next: (data) => {
        this.entries = data.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onFilterChange() {
    this.loadEntries();
  }

  toggleCompose() {
    this.showCompose = !this.showCompose;
  }

  saveEntry() {
    if (!this.newContent) return;
    this.isSaving = true;

    this.diaryService.saveEntry({
      title: this.newTitle || undefined,
      content: this.newContent,
      date: this.newDate
    }).subscribe({
      next: (entry) => {
        // Prepend new entry
        this.entries = [entry, ...this.entries];
        
        // Reset form
        this.newTitle = '';
        this.newContent = '';
        this.newDate = new Date().toISOString().substring(0, 10);
        this.isSaving = false;
        
        // Hide compose panel on mobile
        this.showCompose = false;
      },
      error: () => {
        this.isSaving = false;
      }
    });
  }

  deleteEntry(id: string) {
    if (!confirm('Are you sure you want to delete this journal entry?')) return;
    
    // Optimistic UI update
    this.entries = this.entries.filter(e => e.id !== id);

    this.diaryService.deleteEntry(id).subscribe({
      error: () => {
        // Rollback on failure
        this.loadEntries();
      }
    });
  }
}
