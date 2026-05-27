import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-wrapper animate-fade-in">
      <div class="glass-card auth-card">
        <div class="auth-header">
          <div class="logo-badge">P</div>
          <h2>Personal Management</h2>
          <p class="subtitle">Securely manage your finance, logs, and diary</p>
        </div>
        
        <!-- Tab Selectors -->
        <div class="auth-tabs">
          <button [class.active]="isLogin" (click)="isLogin = true">Login</button>
          <button [class.active]="!isLogin" (click)="isLogin = false">Register</button>
        </div>

        <form (ngSubmit)="onSubmit()" #authForm="ngForm" class="auth-form">
          <div class="form-group">
            <label for="username">Username</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              [(ngModel)]="username" 
              required 
              placeholder="Enter your username"
              autocomplete="username">
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              [(ngModel)]="password" 
              required 
              placeholder="••••••••"
              autocomplete="current-password">
          </div>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <div class="success-message" *ngIf="successMessage">
            {{ successMessage }}
          </div>

          <button type="submit" [disabled]="!authForm.valid || isLoading" class="btn btn-primary btn-block">
            <span *ngIf="!isLoading">{{ isLogin ? 'Sign In' : 'Sign Up' }}</span>
            <span *ngIf="isLoading" class="loader"></span>
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      width: 100vw;
      background: radial-gradient(circle at top right, rgba(6, 182, 212, 0.08), transparent 40%),
                  radial-gradient(circle at bottom left, rgba(16, 185, 129, 0.08), transparent 40%),
                  var(--bg-primary);
      padding: 20px;
    }
    
    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 32px;
    }
    
    .auth-header {
      text-align: center;
      margin-bottom: 28px;
    }
    
    .logo-badge {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-green));
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: white;
      font-size: 1.5rem;
      margin-bottom: 16px;
      box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);
    }
    
    .subtitle {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    
    .auth-tabs {
      display: flex;
      background: rgba(255, 255, 255, 0.03);
      padding: 4px;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      margin-bottom: 24px;
    }
    
    .auth-tabs button {
      flex: 1;
      background: transparent;
      border: none;
      padding: 10px;
      border-radius: 8px;
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: var(--transition-fast);
    }
    
    .auth-tabs button.active {
      background: rgba(255, 255, 255, 0.07);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
    }
    
    .btn-block {
      width: 100%;
      margin-top: 8px;
    }
    
    .error-message {
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.2);
      color: var(--accent-danger);
      padding: 12px;
      border-radius: 8px;
      font-size: 0.85rem;
      text-align: center;
    }

    .success-message {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: var(--accent-green);
      padding: 12px;
      border-radius: 8px;
      font-size: 0.85rem;
      text-align: center;
    }
    
    .loader {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AuthComponent {
  authService = inject(AuthService);
  router = inject(Router);

  isLogin = true;
  username = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    if (this.isLogin) {
      this.authService.login(this.username, this.password).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Invalid username or password.';
        }
      });
    } else {
      this.authService.register(this.username, this.password).subscribe({
        next: () => {
          this.isLoading = false;
          this.successMessage = 'Registration successful! You can now log in.';
          this.isLogin = true;
          this.password = '';
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Username already taken or invalid details.';
        }
      });
    }
  }
}
