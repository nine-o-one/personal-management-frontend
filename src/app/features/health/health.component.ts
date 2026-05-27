import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HealthService, CardioActivity, Exercise, GymSession, GymSet, GymHistoryPoint, Shoe } from '../../core/services/health.service';
import { forkJoin, catchError, of } from 'rxjs';

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="health-container animate-fade-in">
      <div class="health-header">
        <div>
          <h1>Health & Fitness Log</h1>
          <p class="text-secondary">Log cardio, gym sessions, track strength progression, and manage shoes</p>
        </div>
      </div>

      <!-- Tab selectors -->
      <div class="health-tabs">
        <button [class.active]="activeTab === 'gym'" (click)="setTab('gym')">Gym Training</button>
        <button [class.active]="activeTab === 'cardio'" (click)="setTab('cardio')">Cardio Logs</button>
        <button [class.active]="activeTab === 'gear'" (click)="setTab('gear')">Running Gear</button>
      </div>

      <div class="health-content">
        <!-- ================= GYM TRAINING TAB ================= -->
        <div *ngIf="activeTab === 'gym'" class="tab-layout">
          <!-- Left side: Session logs & exercise progression -->
          <div class="main-panel">
            <!-- Exercise progression chart widget -->
            <div class="glass-card progression-card">
              <h3>Strength Progression Chart</h3>
              <div class="chart-controls">
                <label>Select Exercise</label>
                <select [(ngModel)]="chartExerciseId" (change)="loadStrengthHistory()">
                  <option value="">Choose an exercise...</option>
                  <option *ngFor="let ex of exercises" [value]="ex.id">{{ ex.name }} ({{ ex.category }})</option>
                </select>
              </div>

              <!-- Progression line chart -->
              <div class="progression-chart-wrapper" *ngIf="chartExerciseId">
                <div *ngIf="isHistoryLoading" class="chart-state">
                  <span class="loader"></span>
                </div>
                <div *ngIf="!isHistoryLoading && exerciseHistory.length === 0" class="chart-state empty-state">
                  No history recorded for this exercise. Log a session with this exercise to see progression.
                </div>
                
                <svg viewBox="0 0 450 160" width="100%" class="progression-svg" *ngIf="!isHistoryLoading && exerciseHistory.length > 0">
                  <!-- Grid Lines -->
                  <line x1="40" y1="20" x2="430" y2="20" stroke="rgba(255,255,255,0.05)" />
                  <line x1="40" y1="70" x2="430" y2="70" stroke="rgba(255,255,255,0.05)" />
                  <line x1="40" y1="120" x2="430" y2="120" stroke="rgba(255,255,255,0.1)" />
                  
                  <!-- Connect line -->
                  <path [attr.d]="svgLinePath" fill="none" stroke="var(--accent-green)" stroke-width="2.5" />
                  
                  <!-- Points -->
                  <g *ngFor="let pt of chartPoints; let idx = index">
                    <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="5" fill="var(--accent-green)" stroke="#ffffff" stroke-width="1.5" />
                    <!-- Tooltip label -->
                    <text [attr.x]="pt.x" [attr.y]="pt.y - 10" fill="#ffffff" font-size="8" font-weight="bold" text-anchor="middle">
                      {{ pt.weight }}kg ({{ pt.reps }}r)
                    </text>
                    <!-- Date label -->
                    <text [attr.x]="pt.x" y="138" fill="var(--text-secondary)" font-size="7" text-anchor="middle">
                      {{ pt.date | date:'MM/dd' }}
                    </text>
                  </g>
                </svg>
              </div>
            </div>

            <!-- List of gym sessions -->
            <div class="logs-section">
              <h2>Recent Workouts</h2>
              <div *ngIf="isLoading" class="state-indicator">
                <span class="loader"></span>
              </div>
              <div *ngIf="!isLoading && gymSessions.length === 0" class="empty-state glass-card">
                No gym sessions logged yet. Complete the form to record your first workout.
              </div>

              <div class="sessions-list" *ngIf="!isLoading && gymSessions.length > 0">
                <div *ngFor="let session of gymSessions" class="glass-card session-card animate-slide-up">
                  <div class="session-card-header">
                    <div>
                      <h3>Gym Session</h3>
                      <span class="date">{{ session.date | date:'EEEE, MMM d, y - h:mm a' }}</span>
                    </div>
                    <span class="duration-badge" *ngIf="session.duration_minutes">
                      {{ session.duration_minutes }} min
                    </span>
                  </div>
                  
                  <p class="notes" *ngIf="session.notes">"{{ session.notes }}"</p>
                  
                  <div class="sets-table">
                    <div class="table-header-row">
                      <span>Exercise</span>
                      <span class="text-right">Weight</span>
                      <span class="text-right">Reps</span>
                      <span class="text-right">RPE</span>
                      <span>Notes</span>
                    </div>
                    <div *ngFor="let set of session.sets" class="table-data-row">
                      <span class="exercise-name">{{ getExerciseName(set.exercise_id) }}</span>
                      <span class="text-right font-bold">{{ set.weight }} kg</span>
                      <span class="text-right">{{ set.repetitions }}</span>
                      <span class="text-right">{{ set.rpe || '-' }}</span>
                      <span class="set-note text-secondary">{{ set.notes || '' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right side: Session Builder & Exercise Creator -->
          <div class="side-panel">
            <!-- Log Gym Session Builder -->
            <div class="glass-card form-card">
              <h2>Log Workout</h2>
              
              <form (ngSubmit)="logGymSession()" #gymForm="ngForm" class="health-form">
                <div class="form-group">
                  <label for="gymDate">Date & Time</label>
                  <input type="datetime-local" id="gymDate" name="gymDate" [(ngModel)]="newGymDate" required>
                </div>
                
                <div class="form-group">
                  <label for="gymDuration">Duration (minutes)</label>
                  <input type="number" id="gymDuration" name="gymDuration" [(ngModel)]="newGymDuration" placeholder="60">
                </div>

                <div class="form-group">
                  <label for="gymNotes">Session Notes</label>
                  <input type="text" id="gymNotes" name="gymNotes" [(ngModel)]="newGymNotes" placeholder="Heavy push day">
                </div>

                <hr class="divider">
                
                <!-- Dynamic Sets Builder -->
                <div class="sets-builder">
                  <h4>Exercises & Sets</h4>
                  
                  <!-- Selected Sets List -->
                  <div class="builder-sets-list" *ngIf="newGymSets.length > 0">
                    <div *ngFor="let set of newGymSets; let idx = index" class="builder-set-row">
                      <div class="set-info">
                        <span class="set-num">#{{ set.set_number }}</span>
                        <span class="set-ex-name">{{ getExerciseName(set.exercise_id) }}</span>
                        <span class="set-stats">{{ set.weight }}kg x {{ set.repetitions }} (RPE {{ set.rpe || '-' }})</span>
                      </div>
                      <button type="button" class="remove-set-btn" (click)="removeSetFromBuilder(idx)">×</button>
                    </div>
                  </div>

                  <!-- Add Set Inputs -->
                  <div class="add-set-controls">
                    <div class="form-group">
                      <label>Exercise</label>
                      <select [(ngModel)]="builderExerciseId" name="builderExercise">
                        <option value="">Select Exercise</option>
                        <option *ngFor="let ex of exercises" [value]="ex.id">{{ ex.name }}</option>
                      </select>
                    </div>

                    <div class="grid-3">
                      <div class="form-group">
                        <label>Weight (kg)</label>
                        <input type="number" step="0.5" [(ngModel)]="builderWeight" name="builderWeight" placeholder="80">
                      </div>
                      <div class="form-group">
                        <label>Reps</label>
                        <input type="number" [(ngModel)]="builderReps" name="builderReps" placeholder="10">
                      </div>
                      <div class="form-group">
                        <label>RPE (1-10)</label>
                        <input type="number" min="1" max="10" [(ngModel)]="builderRpe" name="builderRpe" placeholder="8">
                      </div>
                    </div>
                    
                    <div class="form-group">
                      <label>Set Notes</label>
                      <input type="text" [(ngModel)]="builderNotes" name="builderNotes" placeholder="Felt strong">
                    </div>

                    <button type="button" class="btn btn-secondary w-full" (click)="addSetToBuilder()">
                      + Add Set to Session
                    </button>
                  </div>
                </div>

                <button type="submit" [disabled]="newGymSets.length === 0 || !gymForm.valid || isSavingSession" class="btn btn-success w-full">
                  <span *ngIf="!isSavingSession">Save Workout Session</span>
                  <span *ngIf="isSavingSession" class="loader"></span>
                </button>
              </form>
            </div>

            <!-- Create Exercise Form -->
            <div class="glass-card form-card">
              <h2>Add Exercise to Catalog</h2>
              <form (ngSubmit)="addExercise()" #exForm="ngForm" class="health-form">
                <div class="form-group">
                  <label for="exName">Exercise Name</label>
                  <input type="text" id="exName" name="exName" [(ngModel)]="newExName" required placeholder="e.g. Bench Press">
                </div>
                
                <div class="form-group">
                  <label for="exCategory">Muscle Group Category</label>
                  <select id="exCategory" name="exCategory" [(ngModel)]="newExCategory" required>
                    <option value="chest">Chest</option>
                    <option value="back">Back</option>
                    <option value="legs">Legs</option>
                    <option value="shoulders">Shoulders</option>
                    <option value="arms">Arms</option>
                    <option value="core">Core</option>
                    <option value="cardio">Cardio</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="exMachine">Machine / Gear (Optional)</label>
                  <input type="text" id="exMachine" name="exMachine" [(ngModel)]="newExMachine" placeholder="e.g. Barbell, Cable Pull">
                </div>

                <div class="form-group">
                  <label for="exNotes">Notes (Optional)</label>
                  <input type="text" id="exNotes" name="exNotes" [(ngModel)]="newExNotes" placeholder="e.g. Feet flat on floor">
                </div>

                <button type="submit" [disabled]="!exForm.valid || isAddingExercise" class="btn btn-primary w-full">
                  Add Exercise
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- ================= CARDIO TAB ================= -->
        <div *ngIf="activeTab === 'cardio'" class="tab-layout">
          <!-- Left side: Cardio lists -->
          <div class="main-panel">
            <div class="logs-section">
              <h2>Cardio Workouts Log</h2>
              
              <!-- Filter by cardio type -->
              <div class="glass-card filters-card" style="margin-bottom: 20px;">
                <div class="filters-grid" style="grid-template-columns: 1fr;">
                  <div class="filter-group">
                    <label>Filter Activity Type</label>
                    <select [(ngModel)]="filterCardioType" (change)="loadCardioLogs()">
                      <option value="">All Cardio</option>
                      <option value="running">Running</option>
                      <option value="trail_running">Trail Running</option>
                      <option value="cycling">Cycling</option>
                      <option value="hiking">Hiking</option>
                    </select>
                  </div>
                </div>
              </div>

              <div *ngIf="isLoading" class="state-indicator">
                <span class="loader"></span>
              </div>
              <div *ngIf="!isLoading && cardioLogs.length === 0" class="empty-state glass-card">
                No cardio logs found. Log your runs or rides.
              </div>

              <div class="cardio-list" *ngIf="!isLoading && cardioLogs.length > 0">
                <div *ngFor="let act of cardioLogs" class="glass-card cardio-card animate-slide-up">
                  <div class="cardio-card-header">
                    <div class="type-info">
                      <span class="cardio-type-icon" [class]="act.type">🏃</span>
                      <div>
                        <h3>{{ formatCardioType(act.type) }}</h3>
                        <span class="date">{{ act.date | date:'EEEE, MMM d, y - h:mm a' }}</span>
                      </div>
                    </div>
                    <div class="cardio-stats-summary">
                      <div class="metric">
                        <span class="val">{{ act.distance_km }}</span>
                        <span class="lbl">km</span>
                      </div>
                      <div class="metric">
                        <span class="val">{{ formatDuration(act.duration_seconds) }}</span>
                        <span class="lbl">time</span>
                      </div>
                    </div>
                  </div>

                  <div class="cardio-card-details">
                    <span *ngIf="act.avg_heart_rate">Avg HR: <strong>{{ act.avg_heart_rate }} bpm</strong></span>
                    <span *ngIf="act.elevation_gain_m">Elevation: <strong>+{{ act.elevation_gain_m }}m</strong></span>
                    <span *ngIf="act.perceived_effort">Effort: <strong>{{ act.perceived_effort }}/10</strong></span>
                    <span *ngIf="act.shoe_id">Shoe: <strong>{{ getShoeName(act.shoe_id) }}</strong></span>
                  </div>

                  <p class="notes" *ngIf="act.notes">"{{ act.notes }}"</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Right side: Log Cardio Form -->
          <div class="side-panel">
            <div class="glass-card form-card">
              <h2>Log Cardio Workout</h2>
              <form (ngSubmit)="logCardio()" #cardioForm="ngForm" class="health-form">
                <div class="form-group">
                  <label for="cardioType">Activity Type</label>
                  <select id="cardioType" name="cardioType" [(ngModel)]="newCardioType" required>
                    <option value="running">Running</option>
                    <option value="trail_running">Trail Running</option>
                    <option value="cycling">Cycling</option>
                    <option value="hiking">Hiking</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="cardioDate">Date & Time</label>
                  <input type="datetime-local" id="cardioDate" name="cardioDate" [(ngModel)]="newCardioDate" required>
                </div>

                <div class="grid-2">
                  <div class="form-group">
                    <label for="cardioDist">Distance (km)</label>
                    <input type="number" step="0.01" id="cardioDist" name="cardioDist" [(ngModel)]="newCardioDistance" required placeholder="10.0">
                  </div>
                  <div class="form-group">
                    <label for="cardioDur">Duration (minutes)</label>
                    <input type="number" id="cardioDur" name="cardioDur" [(ngModel)]="newCardioDurationMin" required placeholder="45">
                  </div>
                </div>

                <div class="grid-2">
                  <div class="form-group">
                    <label for="cardioAvgHr">Avg HR (bpm)</label>
                    <input type="number" id="cardioAvgHr" name="cardioAvgHr" [(ngModel)]="newCardioAvgHr" placeholder="150">
                  </div>
                  <div class="form-group">
                    <label for="cardioMaxHr">Max HR (bpm)</label>
                    <input type="number" id="cardioMaxHr" name="cardioMaxHr" [(ngModel)]="newCardioMaxHr" placeholder="175">
                  </div>
                </div>

                <div class="grid-2">
                  <div class="form-group">
                    <label for="cardioElev">Elevation Gain (m)</label>
                    <input type="number" step="0.5" id="cardioElev" name="cardioElev" [(ngModel)]="newCardioElevation" placeholder="200">
                  </div>
                  <div class="form-group">
                    <label for="cardioEffort">Perceived Effort (1-10)</label>
                    <input type="number" min="1" max="10" id="cardioEffort" name="cardioEffort" [(ngModel)]="newCardioEffort" placeholder="7">
                  </div>
                </div>

                <div class="form-group">
                  <label for="cardioShoe">Gear (Shoes)</label>
                  <select id="cardioShoe" name="cardioShoe" [(ngModel)]="newCardioShoeId">
                    <option value="">Select Shoe</option>
                    <option *ngFor="let shoe of activeShoes" [value]="shoe.id">{{ shoe.brand }} - {{ shoe.name }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="cardioNotes">Notes</label>
                  <input type="text" id="cardioNotes" name="cardioNotes" [(ngModel)]="newCardioNotes" placeholder="Sunny day, felt good">
                </div>

                <button type="submit" [disabled]="!cardioForm.valid || isLoggingCardio" class="btn btn-primary w-full">
                  <span *ngIf="!isLoggingCardio">Save Workout</span>
                  <span *ngIf="isLoggingCardio" class="loader"></span>
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- ================= GEAR TAB ================= -->
        <div *ngIf="activeTab === 'gear'" class="tab-layout">
          <!-- Left side: Shoe lists -->
          <div class="main-panel">
            <div class="logs-section">
              <h2>Running Shoes</h2>
              
              <div *ngIf="isLoading" class="state-indicator">
                <span class="loader"></span>
              </div>
              <div *ngIf="!isLoading && shoes.length === 0" class="empty-state glass-card">
                No shoes logged. Add a pair of shoes to track your run usage!
              </div>

              <div class="shoes-grid" *ngIf="!isLoading && shoes.length > 0">
                <div *ngFor="let shoe of shoes" class="glass-card shoe-card" [class.retired]="shoe.retired">
                  <div class="shoe-card-header">
                    <div>
                      <h3>{{ shoe.brand }}</h3>
                      <h4>{{ shoe.name }}</h4>
                    </div>
                    <span class="status-badge" [class.retired-badge]="shoe.retired">
                      {{ shoe.retired ? 'Retired' : 'Active' }}
                    </span>
                  </div>
                  
                  <div class="shoe-footer">
                    <span class="date">Purchased: {{ shoe.purchase_date | date:'mediumDate' }}</span>
                    <button *ngIf="!shoe.retired" class="btn-retire" (click)="retireShoe(shoe.id)">
                      Retire
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right side: Add Shoe Form -->
          <div class="side-panel">
            <div class="glass-card form-card">
              <h2>Log Running Shoes</h2>
              <form (ngSubmit)="logShoe()" #shoeForm="ngForm" class="health-form">
                <div class="form-group">
                  <label for="shoeBrand">Brand</label>
                  <input type="text" id="shoeBrand" name="shoeBrand" [(ngModel)]="newShoeBrand" required placeholder="e.g. Nike, Hoka">
                </div>

                <div class="form-group">
                  <label for="shoeName">Model Name</label>
                  <input type="text" id="shoeName" name="shoeName" [(ngModel)]="newShoeName" required placeholder="e.g. Pegasus 40">
                </div>

                <div class="form-group">
                  <label for="shoeDate">Purchase Date</label>
                  <input type="date" id="shoeDate" name="shoeDate" [(ngModel)]="newShoeDate" required>
                </div>

                <button type="submit" [disabled]="!shoeForm.valid || isLoggingShoe" class="btn btn-primary w-full">
                  Add Running Shoes
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .health-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .health-tabs {
      display: flex;
      background: rgba(255, 255, 255, 0.03);
      padding: 4px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      max-width: 450px;
    }

    .health-tabs button {
      flex: 1;
      background: transparent;
      border: none;
      padding: 12px 6px;
      border-radius: 8px;
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: var(--transition-fast);
    }

    .health-tabs button.active {
      background: var(--accent-green-glow);
      color: var(--accent-green);
    }

    .tab-layout {
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

    .progression-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .chart-controls {
      display: flex;
      flex-direction: column;
      max-width: 300px;
    }

    .progression-chart-wrapper {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 12px;
      padding: 16px;
      min-height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .progression-svg {
      overflow: visible;
    }

    .chart-state {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .logs-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .sessions-list {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .session-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .session-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      padding-bottom: 8px;
    }

    .session-card-header h3 {
      font-size: 1.1rem;
    }

    .session-card-header .date {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .duration-badge {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--accent-green);
      background: var(--accent-green-glow);
      padding: 2px 8px;
      border-radius: 6px;
    }

    .notes {
      font-size: 0.88rem;
      color: var(--text-secondary);
      font-style: italic;
    }

    .sets-table {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .table-header-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 2fr;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      padding-bottom: 4px;
    }

    .table-data-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 2fr;
      font-size: 0.82rem;
      padding: 4px 0;
      border-bottom: 1px solid rgba(255,255,255,0.02);
    }

    .table-data-row:last-child {
      border-bottom: none;
    }

    .exercise-name {
      font-weight: 600;
      color: #ffffff;
    }

    .set-note {
      font-size: 0.75rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .text-right {
      text-align: right;
      padding-right: 8px;
    }

    .font-bold {
      font-weight: bold;
    }

    /* Side Panel Form */
    .side-panel {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .health-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .divider {
      border: 0;
      height: 1px;
      background: var(--border-color);
      margin: 8px 0;
    }

    /* Sets Builder */
    .sets-builder {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.03);
      border-radius: 12px;
      padding: 12px;
    }

    .sets-builder h4 {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent-cyan);
    }

    .builder-sets-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 8px;
    }

    .builder-set-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
      padding: 6px 10px;
    }

    .set-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
    }

    .set-num {
      font-weight: bold;
      color: var(--accent-green);
    }

    .set-ex-name {
      font-weight: 600;
      color: #ffffff;
    }

    .set-stats {
      color: var(--text-secondary);
    }

    .remove-set-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1.1rem;
      line-height: 1;
    }

    .remove-set-btn:hover {
      color: var(--accent-danger);
    }

    .add-set-controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-top: 1px solid rgba(255,255,255,0.05);
      padding-top: 10px;
    }

    /* Cardio List styling */
    .cardio-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .cardio-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .cardio-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .type-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .cardio-type-icon {
      width: 40px;
      height: 40px;
      background: var(--accent-cyan-glow);
      border: 1px solid rgba(6, 182, 212, 0.2);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
    }

    .trail_running {
      background: var(--accent-green-glow);
      border-color: rgba(16, 185, 129, 0.2);
    }

    .cardio-stats-summary {
      display: flex;
      gap: 16px;
    }

    .cardio-stats-summary .metric {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .cardio-stats-summary .metric .val {
      font-family: 'Outfit', sans-serif;
      font-size: 1.3rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.1;
    }

    .cardio-stats-summary .metric .lbl {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .cardio-card-details {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 0.8rem;
      color: var(--text-secondary);
      background: rgba(255,255,255,0.02);
      padding: 8px 12px;
      border-radius: 8px;
    }

    /* Shoes styling */
    .shoes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }

    .shoe-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      min-height: 120px;
    }

    .shoe-card.retired {
      opacity: 0.55;
      background: rgba(255,255,255,0.01);
      border-color: rgba(255,255,255,0.03);
    }

    .status-badge {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--accent-green);
      background: var(--accent-green-glow);
      padding: 2px 8px;
      border-radius: 4px;
      height: fit-content;
    }

    .retired-badge {
      color: var(--text-muted);
      background: rgba(255,255,255,0.06);
    }

    .shoe-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255,255,255,0.03);
      padding-top: 10px;
      font-size: 0.75rem;
    }

    .btn-retire {
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.2);
      color: var(--accent-danger);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      cursor: pointer;
      font-weight: 600;
      transition: var(--transition-fast);
    }

    .btn-retire:hover {
      background: rgba(244, 63, 94, 0.2);
    }

    .state-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .loader {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: var(--accent-green);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 992px) {
      .tab-layout {
        grid-template-columns: 1fr;
      }
      .side-panel {
        position: static;
      }
    }
  `]
})
export class HealthComponent implements OnInit {
  private healthService = inject(HealthService);

  activeTab: 'gym' | 'cardio' | 'gear' = 'gym';
  isLoading = false;

  // Catalog State
  exercises: Exercise[] = [];
  gymSessions: GymSession[] = [];
  cardioLogs: CardioActivity[] = [];
  shoes: Shoe[] = [];
  activeShoes: Shoe[] = [];

  // ---------------- GYM STATE ----------------
  // Log Gym Session form fields
  newGymDate = '';
  newGymDuration: number | null = null;
  newGymNotes = '';
  newGymSets: Array<{
    exercise_id: string;
    weight: number;
    repetitions: number;
    set_number: number;
    rpe?: number;
    notes?: string;
  }> = [];
  isSavingSession = false;

  // Temporary builder fields
  builderExerciseId = '';
  builderWeight: number | null = null;
  builderReps: number | null = null;
  builderRpe: number | null = null;
  builderNotes = '';

  // Add Exercise catalog form fields
  newExName = '';
  newExCategory: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' = 'chest';
  newExMachine = '';
  newExNotes = '';
  isAddingExercise = false;

  // Exercise history chart fields
  chartExerciseId = '';
  exerciseHistory: GymHistoryPoint[] = [];
  chartPoints: Array<{ x: number; y: number; weight: number; reps: number; date: string }> = [];
  svgLinePath = '';
  isHistoryLoading = false;

  // ---------------- CARDIO STATE ----------------
  // Filters
  filterCardioType = '';
  
  // Log Cardio Form Fields
  newCardioType: 'running' | 'trail_running' | 'cycling' | 'hiking' = 'running';
  newCardioDate = '';
  newCardioDistance: number | null = null;
  newCardioDurationMin: number | null = null;
  newCardioAvgHr: number | null = null;
  newCardioMaxHr: number | null = null;
  newCardioElevation: number | null = null;
  newCardioEffort: number | null = null;
  newCardioShoeId = '';
  newCardioNotes = '';
  isLoggingCardio = false;

  // ---------------- GEAR STATE ----------------
  newShoeBrand = '';
  newShoeName = '';
  newShoeDate = new Date().toISOString().substring(0, 10);
  isLoggingShoe = false;

  ngOnInit() {
    this.setDateTimeDefaults();
    this.loadCatalogData();
  }

  setDateTimeDefaults() {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    this.newGymDate = localISOTime;
    this.newCardioDate = localISOTime;
  }

  loadCatalogData() {
    this.isLoading = true;
    forkJoin({
      exercises: this.healthService.getExercises().pipe(catchError(() => of([]))),
      sessions: this.healthService.getGymSessions().pipe(catchError(() => of([]))),
      cardio: this.healthService.getCardioActivities().pipe(catchError(() => of([]))),
      shoes: this.healthService.getShoes().pipe(catchError(() => of([])))
    }).subscribe(results => {
      this.exercises = results.exercises;
      this.gymSessions = results.sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      this.cardioLogs = results.cardio.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      this.shoes = results.shoes;
      this.activeShoes = this.shoes.filter(s => !s.retired);
      this.isLoading = false;
    });
  }

  setTab(tab: 'gym' | 'cardio' | 'gear') {
    this.activeTab = tab;
  }

  // --- GYM METHODS ---
  getExerciseName(id: string): string {
    const ex = this.exercises.find(e => e.id === id);
    return ex ? ex.name : 'Exercise';
  }

  addSetToBuilder() {
    if (!this.builderExerciseId || this.builderWeight === null || this.builderReps === null) return;
    
    // Count sets for this exercise to generate correct set_number
    const setNum = this.newGymSets.filter(s => s.exercise_id === this.builderExerciseId).length + 1;

    this.newGymSets.push({
      exercise_id: this.builderExerciseId,
      weight: this.builderWeight,
      repetitions: this.builderReps,
      set_number: setNum,
      rpe: this.builderRpe || undefined,
      notes: this.builderNotes || undefined
    });

    // Reset set fields (keep exercise id selected for easier multi-set logging)
    this.builderWeight = null;
    this.builderReps = null;
    this.builderRpe = null;
    this.builderNotes = '';
  }

  removeSetFromBuilder(idx: number) {
    const removedSet = this.newGymSets[idx];
    this.newGymSets.splice(idx, 1);
    
    // Recalculate set numbers for the remaining sets of the same exercise
    let count = 1;
    this.newGymSets.forEach(s => {
      if (s.exercise_id === removedSet.exercise_id) {
        s.set_number = count++;
      }
    });
  }

  logGymSession() {
    if (this.newGymSets.length === 0) return;
    this.isSavingSession = true;

    this.healthService.logGymSession({
      date: new Date(this.newGymDate).toISOString(),
      duration_minutes: this.newGymDuration || undefined,
      notes: this.newGymNotes || undefined,
      sets: this.newGymSets
    }).subscribe({
      next: (session) => {
        this.gymSessions = [session, ...this.gymSessions];
        
        // Reset
        this.newGymSets = [];
        this.newGymNotes = '';
        this.newGymDuration = null;
        this.setDateTimeDefaults();
        this.isSavingSession = false;
        
        // Reload history if selected
        if (this.chartExerciseId) {
          this.loadStrengthHistory();
        }
      },
      error: () => {
        this.isSavingSession = false;
      }
    });
  }

  addExercise() {
    if (!this.newExName) return;
    this.isAddingExercise = true;

    this.healthService.addExercise({
      name: this.newExName,
      category: this.newExCategory,
      machine_name: this.newExMachine || undefined,
      notes: this.newExNotes || undefined
    }).subscribe({
      next: (ex) => {
        this.exercises.push(ex);
        this.newExName = '';
        this.newExMachine = '';
        this.newExNotes = '';
        this.isAddingExercise = false;
      },
      error: () => {
        this.isAddingExercise = false;
      }
    });
  }

  loadStrengthHistory() {
    if (!this.chartExerciseId) {
      this.exerciseHistory = [];
      this.chartPoints = [];
      this.svgLinePath = '';
      return;
    }

    this.isHistoryLoading = true;
    this.healthService.getExerciseHistory(this.chartExerciseId).subscribe({
      next: (history) => {
        // Sort history by date ascending
        this.exerciseHistory = history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        this.isHistoryLoading = false;
        
        this.computeChartPoints();
      },
      error: () => {
        this.isHistoryLoading = false;
        this.exerciseHistory = [];
        this.chartPoints = [];
        this.svgLinePath = '';
      }
    });
  }

  computeChartPoints() {
    if (this.exerciseHistory.length === 0) return;
    
    // Find min and max weight for scaling (y values)
    const weights = this.exerciseHistory.map(h => h.weight);
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);
    const weightRange = maxWeight - minWeight || 10; // Avoid division by 0

    // Chart margins
    const marginX = 40;
    const marginY = 30;
    const chartHeight = 100;
    const chartWidth = 380;
    const pointsCount = this.exerciseHistory.length;

    this.chartPoints = this.exerciseHistory.map((h, idx) => {
      // Calculate X: spread evenly across chartWidth
      const x = marginX + (pointsCount > 1 ? (idx / (pointsCount - 1)) * chartWidth : chartWidth / 2);
      
      // Calculate Y: scale weight range to chartHeight, with padding. High weight -> low Y coordinate (top of SVG)
      const scalePercent = (h.weight - minWeight) / weightRange;
      const y = marginY + chartHeight - (scalePercent * chartHeight);

      return {
        x,
        y,
        weight: h.weight,
        reps: h.repetitions,
        date: h.date
      };
    });

    // Build SVG path
    if (this.chartPoints.length > 0) {
      this.svgLinePath = `M ${this.chartPoints[0].x} ${this.chartPoints[0].y} ` +
        this.chartPoints.slice(1).map(pt => `L ${pt.x} ${pt.y}`).join(' ');
    } else {
      this.svgLinePath = '';
    }
  }

  // --- CARDIO METHODS ---
  loadCardioLogs() {
    this.isLoading = true;
    this.healthService.getCardioActivities((this.filterCardioType as any) || undefined).subscribe({
      next: (logs) => {
        this.cardioLogs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  formatCardioType(type: string): string {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  formatDuration(sec: number): string {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hrs > 0 ? hrs + 'h ' : ''}${mins}m ${s}s`;
  }

  getShoeName(id: string): string {
    const shoe = this.shoes.find(s => s.id === id);
    return shoe ? `${shoe.brand} ${shoe.name}` : 'Unknown Gear';
  }

  logCardio() {
    if (this.newCardioDistance === null || this.newCardioDurationMin === null) return;
    this.isLoggingCardio = true;

    this.healthService.logCardioActivity({
      type: this.newCardioType,
      date: new Date(this.newCardioDate).toISOString(),
      distance_km: this.newCardioDistance,
      duration_seconds: this.newCardioDurationMin * 60, // convert minutes to seconds
      avg_heart_rate: this.newCardioAvgHr || undefined,
      max_heart_rate: this.newCardioMaxHr || undefined,
      elevation_gain_m: this.newCardioElevation || undefined,
      perceived_effort: this.newCardioEffort || undefined,
      shoe_id: this.newCardioShoeId || undefined,
      notes: this.newCardioNotes || undefined
    }).subscribe({
      next: (act) => {
        this.cardioLogs = [act, ...this.cardioLogs];
        
        // Reset
        this.newCardioDistance = null;
        this.newCardioDurationMin = null;
        this.newCardioAvgHr = null;
        this.newCardioMaxHr = null;
        this.newCardioElevation = null;
        this.newCardioEffort = null;
        this.newCardioNotes = '';
        this.setDateTimeDefaults();
        this.isLoggingCardio = false;
      },
      error: () => {
        this.isLoggingCardio = false;
      }
    });
  }

  // --- GEAR (SHOES) METHODS ---
  logShoe() {
    if (!this.newShoeBrand || !this.newShoeName) return;
    this.isLoggingShoe = true;

    this.healthService.logShoe({
      brand: this.newShoeBrand,
      name: this.newShoeName,
      purchase_date: this.newShoeDate
    }).subscribe({
      next: (shoe) => {
        this.shoes = [shoe, ...this.shoes];
        this.activeShoes = this.shoes.filter(s => !s.retired);
        
        this.newShoeBrand = '';
        this.newShoeName = '';
        this.isLoggingShoe = false;
      },
      error: () => {
        this.isLoggingShoe = false;
      }
    });
  }

  retireShoe(id: string) {
    if (!confirm('Are you sure you want to retire this pair of running shoes?')) return;

    this.healthService.retireShoe(id).subscribe({
      next: () => {
        const shoe = this.shoes.find(s => s.id === id);
        if (shoe) {
          shoe.retired = true;
          this.activeShoes = this.shoes.filter(s => !s.retired);
        }
      }
    });
  }
}
