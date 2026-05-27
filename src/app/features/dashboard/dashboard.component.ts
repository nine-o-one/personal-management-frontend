import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { DiaryService, DiaryEntry } from '../../core/services/diary.service';
import { FinanceService, FinanceTransaction } from '../../core/services/finance.service';
import { HealthService, GymSession, CardioActivity } from '../../core/services/health.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container animate-fade-in" *ngIf="authService.currentUser$ | async as user">
      <!-- Header Section -->
      <header class="dashboard-header">
        <div>
          <h1>Welcome back, {{ user.username }}</h1>
          <p class="text-secondary">{{ currentDate | date:'fullDate' }}</p>
        </div>
      </header>
      
      <!-- Stats Cards Grid -->
      <section class="stats-grid">
        <!-- Finance Overview Card -->
        <div class="glass-card stat-card accent-border-cyan">
          <div class="stat-header">
            <h3>Net Balance</h3>
            <span class="pill pill-cyan">Finance</span>
          </div>
          <p class="stat-value" [class.negative]="netBalance < 0">
            {{ netBalance >= 0 ? '+' : '' }}{{ netBalance | currency }}
          </p>
          <div class="stat-details">
            <span class="text-green">▲ {{ totalIncome | currency }}</span>
            <span class="text-danger">▼ {{ totalExpense | currency }}</span>
          </div>
        </div>

        <!-- Cardio Summary Card -->
        <div class="glass-card stat-card accent-border-green">
          <div class="stat-header">
            <h3>Cardio Workouts</h3>
            <span class="pill pill-green">Health</span>
          </div>
          <p class="stat-value">{{ totalCardioKm | number:'1.1-2' }} <span class="unit">km</span></p>
          <div class="stat-details">
            <span>{{ cardioActivities.length }} activities logged</span>
          </div>
        </div>

        <!-- Gym Sessions Card -->
        <div class="glass-card stat-card accent-border-green">
          <div class="stat-header">
            <h3>Gym Sessions</h3>
            <span class="pill pill-green">Health</span>
          </div>
          <p class="stat-value">{{ gymSessions.length }}</p>
          <div class="stat-details">
            <span>Last: {{ lastGymSessionDate ? (lastGymSessionDate | date:'shortDate') : 'No workouts' }}</span>
          </div>
        </div>

        <!-- Diary Entries Card -->
        <div class="glass-card stat-card">
          <div class="stat-header">
            <h3>Journal Entries</h3>
            <span class="pill">Diary</span>
          </div>
          <p class="stat-value">{{ diaryEntries.length }}</p>
          <div class="stat-details">
            <span *ngIf="lastEntryMood" [class]="'mood-' + lastEntryMood">
              Last Mood: {{ lastEntryMood | titlecase }}
            </span>
            <span *ngIf="!lastEntryMood">No entries recorded</span>
          </div>
        </div>
      </section>

      <!-- Dashboard Body Grid -->
      <div class="dashboard-body">
        <!-- Left Side: Recent logs -->
        <div class="main-column">
          <!-- Recent Transactions -->
          <div class="glass-card list-section">
            <div class="section-header">
              <h2>Recent Transactions</h2>
              <a routerLink="/finance" class="link-btn">View All</a>
            </div>
            
            <div *ngIf="recentTransactions.length === 0" class="empty-state">
              No recent transactions. Log your income or expenses.
            </div>
            
            <div class="transaction-list" *ngIf="recentTransactions.length > 0">
              <div *ngFor="let tx of recentTransactions" class="list-item">
                <div class="item-left">
                  <div class="tx-indicator" [class.income]="tx.type === 'income'" [class.expense]="tx.type === 'expense'">
                    {{ tx.type === 'income' ? '↙' : '↗' }}
                  </div>
                  <div>
                    <p class="item-title">{{ tx.description || 'Transaction' }}</p>
                    <p class="item-subtitle">{{ tx.transaction_date | date:'mediumDate' }}</p>
                  </div>
                </div>
                <div class="item-right">
                  <span class="item-amount" [class.text-green]="tx.type === 'income'" [class.text-danger]="tx.type === 'expense'">
                    {{ tx.type === 'income' ? '+' : '-' }}{{ tx.amount | currency }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Recent Diary Entry -->
          <div class="glass-card list-section">
            <div class="section-header">
              <h2>Recent Journal Entry</h2>
              <a routerLink="/diary" class="link-btn">View All</a>
            </div>
            
            <div *ngIf="!recentDiaryEntry" class="empty-state">
              No journal entries logged. Reflect on your day.
            </div>
            
            <div class="diary-preview" *ngIf="recentDiaryEntry">
              <div class="diary-preview-header">
                <h3>{{ recentDiaryEntry.title || 'Untitled Entry' }}</h3>
                <span class="date">{{ recentDiaryEntry.entry_date | date:'mediumDate' }}</span>
              </div>
              <p class="diary-preview-content">{{ truncateText(recentDiaryEntry.content, 180) }}</p>
              
              <div class="diary-preview-footer" *ngIf="recentDiaryEntry.analysis">
                <span *ngIf="recentDiaryEntry.analysis.sentiment" class="pill" 
                      [class.pill-green]="recentDiaryEntry.analysis.sentiment === 'positive'"
                      [class.pill-cyan]="recentDiaryEntry.analysis.sentiment === 'neutral'"
                      [class.pill-danger]="recentDiaryEntry.analysis.sentiment === 'negative'">
                  {{ recentDiaryEntry.analysis.sentiment | uppercase }} ({{ recentDiaryEntry.analysis.sentiment_score | percent }})
                </span>
                <span *ngIf="recentDiaryEntry.analysis.classification_category" class="pill">
                  {{ recentDiaryEntry.analysis.classification_category }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side: Quick Logs & Mini Chart -->
        <div class="side-column">
          <!-- Quick Log Controls -->
          <div class="glass-card quick-actions-card">
            <h2>Quick Actions</h2>
            <div class="actions-grid">
              <a routerLink="/finance" class="action-btn">
                <div class="icon-circle cyan-glow">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
                </div>
                <span>Log Finance</span>
              </a>
              <a routerLink="/health" class="action-btn">
                <div class="icon-circle green-glow">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </div>
                <span>Log Workout</span>
              </a>
              <a routerLink="/diary" class="action-btn">
                <div class="icon-circle white-glow">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/><path d="M6 14h10"/></svg>
                </div>
                <span>Write Journal</span>
              </a>
            </div>
          </div>

          <!-- Mini SVG Activity Graph -->
          <div class="glass-card activity-graph-card">
            <h2>Cardio vs Gym (Logs)</h2>
            <div class="graph-container">
              <!-- Simple SVG representation of logs -->
              <svg viewBox="0 0 200 100" width="100%" height="100" class="mini-chart">
                <!-- Grid lines -->
                <line x1="20" y1="10" x2="190" y2="10" stroke="rgba(255,255,255,0.05)" />
                <line x1="20" y1="50" x2="190" y2="50" stroke="rgba(255,255,255,0.05)" />
                <line x1="20" y1="90" x2="190" y2="90" stroke="rgba(255,255,255,0.1)" />
                
                <!-- Gym Bar (Green) -->
                <rect x="50" [attr.y]="90 - Math.min(80, gymSessions.length * 10)" width="25" [attr.height]="Math.min(80, gymSessions.length * 10)" rx="4" fill="var(--accent-green)" />
                <!-- Cardio Bar (Blue) -->
                <rect x="110" [attr.y]="90 - Math.min(80, cardioActivities.length * 10)" width="25" [attr.height]="Math.min(80, cardioActivities.length * 10)" rx="4" fill="var(--accent-cyan)" />
                
                <!-- Labels -->
                <text x="62" y="98" fill="var(--text-secondary)" font-size="8" text-anchor="middle">Gym</text>
                <text x="122" y="98" fill="var(--text-secondary)" font-size="8" text-anchor="middle">Cardio</text>
                
                <!-- Counts -->
                <text x="62" [attr.y]="82 - Math.min(80, gymSessions.length * 10)" fill="#ffffff" font-size="9" font-weight="bold" text-anchor="middle">
                  {{ gymSessions.length }}
                </text>
                <text x="122" [attr.y]="82 - Math.min(80, cardioActivities.length * 10)" fill="#ffffff" font-size="9" font-weight="bold" text-anchor="middle">
                  {{ cardioActivities.length }}
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 28px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .dashboard-header {
      margin-bottom: 8px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }
    
    .stat-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .stat-header h3 {
      font-size: 0.95rem;
      color: var(--text-secondary);
      font-weight: 500;
    }
    
    .stat-value {
      font-size: 2.2rem;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
      line-height: 1.1;
      color: #ffffff;
    }
    
    .stat-value.negative {
      color: var(--accent-danger);
    }
    
    .stat-value .unit {
      font-size: 1.1rem;
      font-weight: 500;
      color: var(--text-secondary);
      margin-left: 4px;
    }
    
    .stat-details {
      display: flex;
      gap: 12px;
      font-size: 0.85rem;
      color: var(--text-secondary);
      font-weight: 500;
    }
    
    .text-green { color: var(--accent-green); }
    .text-danger { color: var(--accent-danger); }
    
    .mood-positive { color: var(--accent-green); font-weight: 600; }
    .mood-neutral { color: var(--accent-cyan); font-weight: 600; }
    .mood-negative { color: var(--accent-danger); font-weight: 600; }

    .dashboard-body {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }
    
    @media (max-width: 992px) {
      .dashboard-body {
        grid-template-columns: 1fr;
      }
    }
    
    .main-column, .side-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    
    .list-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .link-btn {
      font-size: 0.85rem;
      color: var(--accent-cyan);
      text-decoration: none;
      font-weight: 600;
      transition: var(--transition-fast);
    }
    
    .link-btn:hover {
      text-decoration: underline;
    }
    
    .empty-state {
      padding: 32px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.9rem;
      border: 1px dashed rgba(255, 255, 255, 0.05);
      border-radius: 12px;
    }
    
    .transaction-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      transition: var(--transition-fast);
    }
    
    .list-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.06);
    }
    
    .item-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .tx-indicator {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.95rem;
    }
    
    .tx-indicator.income {
      background: var(--accent-green-glow);
      color: var(--accent-green);
    }
    
    .tx-indicator.expense {
      background: var(--accent-danger-glow);
      color: var(--accent-danger);
    }
    
    .item-title {
      font-weight: 600;
      font-size: 0.9rem;
    }
    
    .item-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    .item-amount {
      font-weight: 700;
      font-size: 0.95rem;
    }
    
    /* Diary Preview styles */
    .diary-preview {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.03);
    }
    
    .diary-preview-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    
    .diary-preview-header h3 {
      font-size: 1.05rem;
      font-weight: 600;
    }
    
    .diary-preview-header .date {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    .diary-preview-content {
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.6;
    }
    
    .diary-preview-footer {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }
    
    /* Quick actions */
    .quick-actions-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    
    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 0.75rem;
      font-weight: 600;
      transition: var(--transition-smooth);
      padding: 12px 6px;
      border-radius: 12px;
      border: 1px solid transparent;
    }
    
    .action-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.05);
    }
    
    .icon-circle {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .cyan-glow {
      background: var(--accent-cyan-glow);
      color: var(--accent-cyan);
    }
    .green-glow {
      background: var(--accent-green-glow);
      color: var(--accent-green);
    }
    .white-glow {
      background: rgba(255,255,255,0.06);
      color: #ffffff;
    }
    
    /* Graph */
    .activity-graph-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .graph-container {
      padding: 8px 0;
    }
    
    .mini-chart {
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      padding: 8px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private diaryService = inject(DiaryService);
  private financeService = inject(FinanceService);
  private healthService = inject(HealthService);

  currentDate = new Date();
  Math = Math; // reference to Math for template access
  
  // Data State
  diaryEntries: DiaryEntry[] = [];
  financeTransactions: FinanceTransaction[] = [];
  gymSessions: GymSession[] = [];
  cardioActivities: CardioActivity[] = [];
  
  // Computed values
  netBalance = 0;
  totalIncome = 0;
  totalExpense = 0;
  totalCardioKm = 0;
  lastGymSessionDate: string | null = null;
  lastEntryMood: string | null = null;
  
  // List views
  recentTransactions: FinanceTransaction[] = [];
  recentDiaryEntry: DiaryEntry | null = null;

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    forkJoin({
      diary: this.diaryService.getEntries().pipe(catchError(() => of([]))),
      finance: this.financeService.getTransactions().pipe(catchError(() => of([]))),
      gym: this.healthService.getGymSessions().pipe(catchError(() => of([]))),
      cardio: this.healthService.getCardioActivities().pipe(catchError(() => of([])))
    }).subscribe(results => {
      this.diaryEntries = results.diary;
      this.financeTransactions = results.finance;
      this.gymSessions = results.gym;
      this.cardioActivities = results.cardio;
      
      this.computeDashboardMetrics();
    });
  }

  computeDashboardMetrics() {
    // Finance computed
    this.totalIncome = 0;
    this.totalExpense = 0;
    this.financeTransactions.forEach(tx => {
      if (tx.type === 'income') {
        this.totalIncome += tx.amount;
      } else {
        this.totalExpense += tx.amount;
      }
    });
    this.netBalance = this.totalIncome - this.totalExpense;
    
    // Sort transactions by date and take recent 4
    this.recentTransactions = [...this.financeTransactions]
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
      .slice(0, 4);

    // Cardio mileage
    this.totalCardioKm = this.cardioActivities.reduce((acc, act) => acc + act.distance_km, 0);

    // Last gym date
    if (this.gymSessions.length > 0) {
      const sortedGym = [...this.gymSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      this.lastGymSessionDate = sortedGym[0].date;
    }

    // Recent diary entry
    if (this.diaryEntries.length > 0) {
      const sortedDiary = [...this.diaryEntries].sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
      this.recentDiaryEntry = sortedDiary[0];
      this.lastEntryMood = this.recentDiaryEntry.analysis?.sentiment || null;
    }
  }

  truncateText(text: string, limit: number): string {
    if (text.length <= limit) return text;
    return text.substring(0, limit) + '...';
  }
}
