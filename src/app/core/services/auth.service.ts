import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, map, catchError, throwError } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface User {
  id: string;
  username: string;
  created_at?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  constructor() {
    this.loadCurrentUser();
  }
  
  public get currentUser(): User | null {
    return this.currentUserSubject.value;
  }
  
  private loadCurrentUser() {
    const token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (token && savedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(savedUser));
        // Optionally refresh profile from server to verify token
        this.fetchProfile().subscribe({
          error: () => this.logout()
        });
      } catch (e) {
        this.logout();
      }
    }
  }
  
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_CONFIG.baseUrl}/api/auth/login`, { username, password }).pipe(
      tap(response => {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('auth_user', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
      })
    );
  }
  
  register(username: string, password: string): Observable<User> {
    return this.http.post<User>(`${API_CONFIG.baseUrl}/api/auth/register`, { username, password });
  }
  
  fetchProfile(): Observable<User> {
    return this.http.get<User>(`${API_CONFIG.baseUrl}/api/auth/me`).pipe(
      tap(user => {
        localStorage.setItem('auth_user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }
  
  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth']);
  }
  
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }
}
