import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService, FinanceCategory, FinanceSubcategory, FinanceTransaction } from '../../core/services/finance.service';
import { forkJoin, catchError, of } from 'rxjs';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="finance-container animate-fade-in">
      <div class="finance-header">
        <div>
          <h1>Finance Tracker</h1>
          <p class="text-secondary">Track income, expenses, and manage budgets</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="toggleViewMode()">
            {{ viewMode === 'transactions' ? 'Manage Categories' : 'Log Transactions' }}
          </button>
        </div>
      </div>

      <!-- Financial Totals -->
      <section class="totals-bar glass-card">
        <div class="total-item">
          <span class="label">Net Balance</span>
          <span class="value" [class.text-danger]="netBalance < 0">
            {{ netBalance >= 0 ? '+' : '' }}{{ netBalance | currency }}
          </span>
        </div>
        <div class="total-item">
          <span class="label text-green">Total Income</span>
          <span class="value text-green">{{ totalIncome | currency }}</span>
        </div>
        <div class="total-item">
          <span class="label text-danger">Total Expenses</span>
          <span class="value text-danger">{{ totalExpense | currency }}</span>
        </div>
      </section>

      <div class="finance-layout">
        <!-- Left Pane: Transactions List & Chart -->
        <div class="main-panel">
          <!-- Filter Panel -->
          <div class="glass-card filters-card">
            <h3>Filters</h3>
            <div class="filters-grid">
              <div class="filter-group">
                <label>Type</label>
                <select [(ngModel)]="filterType" (change)="loadTransactions()">
                  <option value="">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div class="filter-group">
                <label>Category</label>
                <select [(ngModel)]="filterCategoryId" (change)="loadTransactions()">
                  <option value="">All Categories</option>
                  <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                </select>
              </div>
              <div class="filter-group">
                <label>Start Date</label>
                <input type="date" [(ngModel)]="filterStartDate" (change)="loadTransactions()">
              </div>
              <div class="filter-group">
                <label>End Date</label>
                <input type="date" [(ngModel)]="filterEndDate" (change)="loadTransactions()">
              </div>
            </div>
          </div>

          <!-- Charts Widget -->
          <div class="glass-card chart-card" *ngIf="transactions.length > 0">
            <h3>Expense Breakdown</h3>
            <div class="chart-container">
              <!-- Inline Responsive SVG Donut Chart -->
              <svg viewBox="0 0 360 200" width="100%" class="svg-chart">
                <g transform="translate(110, 100)">
                  <!-- If no expenses, show placeholder -->
                  <circle cx="0" cy="0" r="70" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="24" *ngIf="expenseBreakdown.length === 0" />
                  
                  <ng-container *ngFor="let segment of donutSegments; let idx = index">
                    <circle cx="0" cy="0" r="70" fill="none" 
                            [attr.stroke]="colors[idx % colors.length]" 
                            stroke-width="24"
                            [attr.stroke-dasharray]="segment.dashArray"
                            [attr.stroke-dashoffset]="segment.dashOffset"
                            transform="rotate(-90)" />
                  </ng-container>
                  
                  <!-- Inner labels -->
                  <text x="0" y="0" text-anchor="middle" fill="#ffffff" font-family="Outfit" font-size="14" font-weight="bold">
                    {{ totalExpense | currency:'USD':'symbol':'1.0-0' }}
                  </text>
                  <text x="0" y="14" text-anchor="middle" fill="var(--text-secondary)" font-size="9">
                    Expenses
                  </text>
                </g>

                <!-- Legend -->
                <g transform="translate(230, 20)">
                  <g *ngFor="let item of expenseBreakdown.slice(0, 7); let idx = index" [attr.transform]="'translate(0,' + idx * 22 + ')'">
                    <rect x="0" y="4" width="10" height="10" rx="2" [attr.fill]="colors[idx % colors.length]" />
                    <text x="16" y="13" fill="#ffffff" font-size="10" font-weight="600">
                      {{ item.name }}
                    </text>
                    <text x="16" y="24" fill="var(--text-secondary)" font-size="8">
                      {{ item.amount | currency }} ({{ item.percentage | percent:'1.0-1' }})
                    </text>
                  </g>
                </g>
              </svg>
            </div>
          </div>

          <!-- Transactions List -->
          <div class="transactions-list-section">
            <div class="section-title">
              <h2>Transactions Record</h2>
            </div>
            
            <div *ngIf="isLoading" class="state-indicator">
              <span class="loader"></span>
              <p>Loading transactions...</p>
            </div>

            <div *ngIf="!isLoading && transactions.length === 0" class="empty-state glass-card">
              No transactions found matching the selected filters.
            </div>

            <div class="transactions-list" *ngIf="!isLoading && transactions.length > 0">
              <div *ngFor="let tx of transactions" class="glass-card list-item animate-slide-up">
                <div class="tx-left">
                  <div class="tx-icon-wrapper" [class.income]="tx.type === 'income'" [class.expense]="tx.type === 'expense'">
                    <span>{{ tx.type === 'income' ? '↙' : '↗' }}</span>
                  </div>
                  <div class="tx-info">
                    <div class="tx-headline">
                      <h4>{{ tx.description || 'Logged item' }}</h4>
                      <span class="category-tag">{{ getCategoryName(tx.category_id) }}</span>
                      <span class="subcategory-tag" *ngIf="tx.subcategory_id">{{ getSubcategoryName(tx.category_id, tx.subcategory_id) }}</span>
                    </div>
                    <div class="tx-details">
                      <span>{{ tx.transaction_date | date:'mediumDate' }}</span>
                      <span class="dot"></span>
                      <span>{{ formatPaymentMethod(tx.payment_method) }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="tx-right">
                  <span class="tx-amount" [class.text-green]="tx.type === 'income'" [class.text-danger]="tx.type === 'expense'">
                    {{ tx.type === 'income' ? '+' : '-' }}{{ tx.amount | currency }}
                  </span>
                  <button class="delete-btn" (click)="deleteTransaction(tx.id)" title="Delete transaction">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Pane: Log forms -->
        <div class="side-panel">
          <!-- Log Transaction Form -->
          <div class="glass-card form-card" *ngIf="viewMode === 'transactions'">
            <h2>Log Transaction</h2>
            
            <form (ngSubmit)="logTransaction()" #txForm="ngForm" class="finance-form">
              <!-- Type Switcher -->
              <div class="type-switch">
                <button type="button" [class.active]="newType === 'expense'" (click)="setNewType('expense')">Expense</button>
                <button type="button" [class.active]="newType === 'income'" (click)="setNewType('income')">Income</button>
              </div>

              <div class="form-group">
                <label for="amount">Amount ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  id="amount" 
                  name="amount" 
                  [(ngModel)]="newAmount" 
                  required 
                  placeholder="0.00">
              </div>

              <div class="form-group">
                <label for="category">Category</label>
                <select id="category" name="category" [(ngModel)]="newCategoryId" (change)="onCategoryChange()" required>
                  <option value="">Select Category</option>
                  <option *ngFor="let cat of getFilteredCategories()" [value]="cat.id">{{ cat.name }}</option>
                </select>
              </div>

              <div class="form-group" *ngIf="newCategoryId && activeSubcategories.length > 0">
                <label for="subcategory">Subcategory (Optional)</label>
                <select id="subcategory" name="subcategory" [(ngModel)]="newSubcategoryId">
                  <option value="">None</option>
                  <option *ngFor="let sub of activeSubcategories" [value]="sub.id">{{ sub.name }}</option>
                </select>
              </div>

              <div class="form-group">
                <label for="date">Transaction Date</label>
                <input type="date" id="date" name="date" [(ngModel)]="newDate" required>
              </div>

              <div class="form-group">
                <label for="payment">Payment Method</label>
                <select id="payment" name="payment" [(ngModel)]="newPaymentMethod" required>
                  <option value="credit_card_black">Black Master</option>
                  <option value="debit_card_bancolombia">Debit Bancolombia</option>
                  <option value="debit_card_payoneer">Payoneer Dolars</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div class="form-group">
                <label for="desc">Description (Optional)</label>
                <input type="text" id="desc" name="desc" [(ngModel)]="newDescription" placeholder="Grocery shopping">
              </div>

              <button type="submit" [disabled]="!txForm.valid || isLogging" class="btn btn-primary w-full">
                <span *ngIf="!isLogging">Save Transaction</span>
                <span *ngIf="isLogging" class="loader"></span>
              </button>
            </form>
          </div>

          <!-- Manage Categories Form -->
          <div class="glass-card form-card" *ngIf="viewMode === 'categories'">
            <h2>Manage Categories</h2>
            
            <!-- Add Category Form -->
            <div class="sub-form-section">
              <h4>Create Category</h4>
              <form (ngSubmit)="createCategory()" #catForm="ngForm" class="finance-form">
                <div class="form-group">
                  <label for="catName">Category Name</label>
                  <input type="text" id="catName" name="catName" [(ngModel)]="newCatName" required placeholder="e.g. Housing, Salary">
                </div>
                <div class="form-group">
                  <label for="catType">Category Type</label>
                  <select id="catType" name="catType" [(ngModel)]="newCatType" required>
                    <option value="expense">Expense Only</option>
                    <option value="income">Income Only</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <button type="submit" [disabled]="!catForm.valid || isCatSaving" class="btn btn-primary w-full">
                  Create Category
                </button>
              </form>
            </div>

            <hr class="divider">

            <!-- Add Subcategory Form -->
            <div class="sub-form-section">
              <h4>Create Subcategory</h4>
              <form (ngSubmit)="createSubcategory()" #subForm="ngForm" class="finance-form">
                <div class="form-group">
                  <label for="subParent">Parent Category</label>
                  <select id="subParent" name="subParent" [(ngModel)]="newSubParentId" required>
                    <option value="">Select Parent Category</option>
                    <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }} ({{ cat.type }})</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="subName">Subcategory Name</label>
                  <input type="text" id="subName" name="subName" [(ngModel)]="newSubName" required placeholder="e.g. Rent, Groceries">
                </div>
                <button type="submit" [disabled]="!subForm.valid || isSubSaving" class="btn btn-primary w-full">
                  Create Subcategory
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .finance-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .finance-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .totals-bar {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      text-align: center;
      padding: 16px;
    }

    .total-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .total-item .label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .total-item .value {
      font-size: 1.6rem;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
    }

    .finance-layout {
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
      gap: 12px;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
    }

    .chart-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .chart-container {
      display: flex;
      justify-content: center;
      padding: 10px 0;
    }

    .svg-chart {
      max-width: 500px;
    }

    .transactions-list-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .transactions-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
    }

    .tx-left {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }

    .tx-icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.1rem;
    }

    .tx-icon-wrapper.income {
      background: var(--accent-green-glow);
      color: var(--accent-green);
    }

    .tx-icon-wrapper.expense {
      background: var(--accent-danger-glow);
      color: var(--accent-danger);
    }

    .tx-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .tx-headline {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .tx-headline h4 {
      font-size: 0.95rem;
      font-weight: 600;
    }

    .category-tag {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--accent-cyan);
      background: var(--accent-cyan-glow);
      padding: 1px 8px;
      border-radius: 4px;
    }

    .subcategory-tag {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-secondary);
      background: rgba(255,255,255,0.04);
      padding: 1px 8px;
      border-radius: 4px;
    }

    .tx-details {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .dot {
      width: 3px;
      height: 3px;
      background-color: var(--text-muted);
      border-radius: 50%;
    }

    .tx-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .tx-amount {
      font-size: 1.1rem;
      font-weight: 700;
      font-family: 'Outfit', sans-serif;
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

    /* Side Panel */
    .side-panel {
      position: sticky;
      top: 24px;
    }

    .form-card {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .finance-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .type-switch {
      display: flex;
      background: rgba(255,255,255,0.03);
      padding: 4px;
      border-radius: 10px;
      border: 1px solid var(--border-color);
    }

    .type-switch button {
      flex: 1;
      background: transparent;
      border: none;
      padding: 8px;
      border-radius: 8px;
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: var(--transition-fast);
    }

    .type-switch button.active {
      background: rgba(255, 255, 255, 0.07);
      color: #ffffff;
    }

    .sub-form-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .sub-form-section h4 {
      font-size: 0.95rem;
      color: var(--text-secondary);
      border-left: 2px solid var(--accent-cyan);
      padding-left: 8px;
      margin-bottom: 4px;
    }

    .divider {
      border: 0;
      height: 1px;
      background: var(--border-color);
      margin: 10px 0;
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
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: var(--accent-cyan);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Colors list for charts segment */
    @media (max-width: 992px) {
      .finance-layout {
        grid-template-columns: 1fr;
      }
      .side-panel {
        position: static;
      }
    }

    @media (max-width: 768px) {
      .totals-bar {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .filters-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class FinanceComponent implements OnInit {
  private financeService = inject(FinanceService);

  viewMode: 'transactions' | 'categories' = 'transactions';
  isLoading = false;
  transactions: FinanceTransaction[] = [];
  categories: FinanceCategory[] = [];
  subcategoriesMap = new Map<string, FinanceSubcategory[]>(); // Category ID -> Subcategories

  // Financial Metrics
  netBalance = 0;
  totalIncome = 0;
  totalExpense = 0;
  expenseBreakdown: { name: string; amount: number; percentage: number }[] = [];
  donutSegments: { dashArray: string; dashOffset: number }[] = [];
  colors = ['#06b6d4', '#10b981', '#f43f5e', '#a855f7', '#eab308', '#3b82f6', '#f97316'];

  // Filters State
  filterType = '';
  filterCategoryId = '';
  filterStartDate = '';
  filterEndDate = '';

  // Log Transaction Fields
  newType: 'income' | 'expense' = 'expense';
  newAmount: number | null = null;
  newCategoryId = '';
  newSubcategoryId = '';
  activeSubcategories: FinanceSubcategory[] = [];
  newDate = new Date().toISOString().substring(0, 10);
  newPaymentMethod = 'credit_card';
  newDescription = '';
  isLogging = false;

  // Manage Categories Fields
  newCatName = '';
  newCatType: 'income' | 'expense' | 'both' = 'expense';
  isCatSaving = false;

  newSubParentId = '';
  newSubName = '';
  isSubSaving = false;

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.isLoading = true;
    forkJoin({
      categories: this.financeService.getCategories().pipe(catchError(() => of([]))),
      transactions: this.financeService.getTransactions().pipe(catchError(() => of([])))
    }).subscribe(results => {
      this.categories = results.categories;
      this.transactions = results.transactions;
      this.isLoading = false;
      
      // Load subcategories for all categories
      this.categories.forEach(cat => {
        this.financeService.getSubcategories(cat.id).subscribe({
          next: (subs) => {
            this.subcategoriesMap.set(cat.id, subs);
          }
        });
      });

      this.computeMetrics();
    });
  }

  loadTransactions() {
    this.isLoading = true;
    this.financeService.getTransactions({
      type: (this.filterType as 'income' | 'expense') || undefined,
      category_id: this.filterCategoryId || undefined,
      start_date: this.filterStartDate || undefined,
      end_date: this.filterEndDate || undefined
    }).subscribe({
      next: (data) => {
        this.transactions = data;
        this.isLoading = false;
        this.computeMetrics();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  computeMetrics() {
    this.totalIncome = 0;
    this.totalExpense = 0;
    const expenseByCat = new Map<string, number>();

    this.transactions.forEach(tx => {
      if (tx.type === 'income') {
        this.totalIncome += tx.amount;
      } else {
        this.totalExpense += tx.amount;
        // Group by category
        const catName = this.getCategoryName(tx.category_id);
        const curr = expenseByCat.get(catName) || 0;
        expenseByCat.set(catName, curr + tx.amount);
      }
    });

    this.netBalance = this.totalIncome - this.totalExpense;

    // Convert breakdown map to array
    const breakdown: { name: string; amount: number; percentage: number }[] = [];
    expenseByCat.forEach((val, key) => {
      breakdown.push({
        name: key,
        amount: val,
        percentage: this.totalExpense > 0 ? (val / this.totalExpense) : 0
      });
    });

    // Sort by amount descending
    this.expenseBreakdown = breakdown.sort((a, b) => b.amount - a.amount);

    // Calculate segments for SVG donut chart (radius = 70, circumference = 2 * PI * 70 = 439.82)
    const circum = 439.82;
    let accumulatedPercent = 0;
    this.donutSegments = this.expenseBreakdown.map(item => {
      const dashArray = `${item.percentage * circum} ${circum}`;
      const dashOffset = -(accumulatedPercent * circum);
      accumulatedPercent += item.percentage;
      return { dashArray, dashOffset };
    });
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'transactions' ? 'categories' : 'transactions';
  }

  setNewType(type: 'income' | 'expense') {
    this.newType = type;
    this.newCategoryId = '';
    this.newSubcategoryId = '';
    this.activeSubcategories = [];
  }

  getFilteredCategories(): FinanceCategory[] {
    return this.categories.filter(c => c.type === 'both' || c.type === this.newType);
  }

  onCategoryChange() {
    this.newSubcategoryId = '';
    if (this.newCategoryId) {
      this.activeSubcategories = this.subcategoriesMap.get(this.newCategoryId) || [];
      // If we don't have subcategories loaded, fetch them
      if (this.activeSubcategories.length === 0) {
        this.financeService.getSubcategories(this.newCategoryId).subscribe({
          next: (subs) => {
            this.subcategoriesMap.set(this.newCategoryId, subs);
            this.activeSubcategories = subs;
          }
        });
      }
    } else {
      this.activeSubcategories = [];
    }
  }

  getCategoryName(id: string): string {
    const cat = this.categories.find(c => c.id === id);
    return cat ? cat.name : 'Unknown';
  }

  getSubcategoryName(catId: string, subId: string): string {
    const subs = this.subcategoriesMap.get(catId);
    if (subs) {
      const sub = subs.find(s => s.id === subId);
      return sub ? sub.name : '';
    }
    return '';
  }

  formatPaymentMethod(pm: string): string {
    return pm.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  logTransaction() {
    if (this.newAmount === null || !this.newCategoryId) return;
    this.isLogging = true;

    this.financeService.logTransaction({
      amount: this.newAmount,
      type: this.newType,
      category_id: this.newCategoryId,
      subcategory_id: this.newSubcategoryId || undefined,
      transaction_date: this.newDate,
      payment_method: this.newPaymentMethod,
      description: this.newDescription || undefined
    }).subscribe({
      next: (tx) => {
        // Prepend new transaction and refresh stats
        this.transactions = [tx, ...this.transactions];
        this.computeMetrics();

        // Reset
        this.newAmount = null;
        this.newDescription = '';
        this.newSubcategoryId = '';
        this.isLogging = false;
      },
      error: () => {
        this.isLogging = false;
      }
    });
  }

  deleteTransaction(id: string) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    // Optimistic UI update
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.computeMetrics();

    this.financeService.deleteTransaction(id).subscribe({
      error: () => {
        // Rollback
        this.loadTransactions();
      }
    });
  }

  createCategory() {
    if (!this.newCatName) return;
    this.isCatSaving = true;

    this.financeService.createCategory({
      name: this.newCatName,
      type: this.newCatType
    }).subscribe({
      next: (cat) => {
        this.categories.push(cat);
        this.newCatName = '';
        this.isCatSaving = false;
        this.viewMode = 'transactions';
      },
      error: () => {
        this.isCatSaving = false;
      }
    });
  }

  createSubcategory() {
    if (!this.newSubParentId || !this.newSubName) return;
    this.isSubSaving = true;

    this.financeService.createSubcategory({
      category_id: this.newSubParentId,
      name: this.newSubName
    }).subscribe({
      next: (sub) => {
        const list = this.subcategoriesMap.get(this.newSubParentId) || [];
        list.push(sub);
        this.subcategoriesMap.set(this.newSubParentId, list);
        
        this.newSubName = '';
        this.isSubSaving = false;
        this.viewMode = 'transactions';
      },
      error: () => {
        this.isSubSaving = false;
      }
    });
  }
}
