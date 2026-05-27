import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface CardioActivity {
  id: string;
  type: 'running' | 'trail_running' | 'cycling' | 'hiking';
  date: string;
  distance_km: number;
  duration_seconds: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  elevation_gain_m?: number;
  notes?: string;
  perceived_effort?: number;
  shoe_id?: string;
  gps_route_data?: any;
}

export interface Exercise {
  id: string;
  name: string;
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
  machine_name?: string;
  notes?: string;
}

export interface GymSet {
  id?: string;
  exercise_id: string;
  weight: number;
  repetitions: number;
  set_number: number;
  rpe?: number;
  notes?: string;
  exercise_name?: string; // Client helper
}

export interface GymSession {
  id: string;
  date: string;
  duration_minutes?: number;
  notes?: string;
  sets: GymSet[];
}

export interface GymHistoryPoint {
  date: string;
  weight: number;
  repetitions: number;
  rpe?: number;
}

export interface Shoe {
  id: string;
  name: string;
  brand: string;
  purchase_date: string;
  retired: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HealthService {
  private http = inject(HttpClient);
  
  // Cardio
  getCardioActivities(type?: 'running' | 'trail_running' | 'cycling' | 'hiking'): Observable<CardioActivity[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<CardioActivity[]>(`${API_CONFIG.baseUrl}/api/health/cardio`, { params });
  }
  
  logCardioActivity(activity: {
    type: 'running' | 'trail_running' | 'cycling' | 'hiking';
    date: string;
    distance_km: number;
    duration_seconds: number;
    avg_heart_rate?: number;
    max_heart_rate?: number;
    elevation_gain_m?: number;
    notes?: string;
    perceived_effort?: number;
    shoe_id?: string;
    gps_route_data?: any;
  }): Observable<CardioActivity> {
    return this.http.post<CardioActivity>(`${API_CONFIG.baseUrl}/api/health/cardio`, activity);
  }
  
  // Exercises
  getExercises(category?: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio'): Observable<Exercise[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    return this.http.get<Exercise[]>(`${API_CONFIG.baseUrl}/api/health/exercises`, { params });
  }
  
  addExercise(exercise: {
    name: string;
    category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
    machine_name?: string;
    notes?: string;
  }): Observable<Exercise> {
    return this.http.post<Exercise>(`${API_CONFIG.baseUrl}/api/health/exercises`, exercise);
  }
  
  // Gym Sessions
  getGymSessions(): Observable<GymSession[]> {
    return this.http.get<GymSession[]>(`${API_CONFIG.baseUrl}/api/health/gym/sessions`);
  }
  
  logGymSession(session: {
    date: string;
    duration_minutes?: number;
    notes?: string;
    sets: Array<{
      exercise_id: string;
      weight: number;
      repetitions: number;
      set_number: number;
      rpe?: number;
      notes?: string;
    }>;
  }): Observable<GymSession> {
    return this.http.post<GymSession>(`${API_CONFIG.baseUrl}/api/health/gym/sessions`, session);
  }
  
  getExerciseHistory(exerciseId: string): Observable<GymHistoryPoint[]> {
    return this.http.get<GymHistoryPoint[]>(`${API_CONFIG.baseUrl}/api/health/gym/history/${exerciseId}`);
  }
  
  // Shoes
  getShoes(retired?: boolean): Observable<Shoe[]> {
    let params = new HttpParams();
    if (retired !== undefined) params = params.set('retired', retired.toString());
    return this.http.get<Shoe[]>(`${API_CONFIG.baseUrl}/api/health/shoes`, { params });
  }
  
  logShoe(shoe: { name: string; brand: string; purchase_date: string }): Observable<Shoe> {
    return this.http.post<Shoe>(`${API_CONFIG.baseUrl}/api/health/shoes`, shoe);
  }
  
  retireShoe(shoeId: string): Observable<void> {
    return this.http.post<void>(`${API_CONFIG.baseUrl}/api/health/shoes/${shoeId}/retire`, {});
  }
}
