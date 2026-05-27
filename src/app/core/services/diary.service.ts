import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface DiaryAnalysis {
  classification_category?: string;
  keywords?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentiment_score?: number;
}

export interface DiaryEntry {
  id: string;
  title?: string;
  content: string;
  entry_date: string;
  user_id: string;
  analysis?: DiaryAnalysis;
}

@Injectable({
  providedIn: 'root'
})
export class DiaryService {
  private http = inject(HttpClient);
  
  getEntries(filters?: { category?: string; sentiment?: string; keyword?: string }): Observable<DiaryEntry[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.category) params = params.set('category', filters.category);
      if (filters.sentiment) params = params.set('sentiment', filters.sentiment);
      if (filters.keyword) params = params.set('keyword', filters.keyword);
    }
    return this.http.get<DiaryEntry[]>(`${API_CONFIG.baseUrl}/api/diary/entries`, { params });
  }
  
  getEntry(entryId: string): Observable<DiaryEntry> {
    return this.http.get<DiaryEntry>(`${API_CONFIG.baseUrl}/api/diary/entries/${entryId}`);
  }
  
  saveEntry(entry: { title?: string; content: string; date: string }): Observable<DiaryEntry> {
    return this.http.post<DiaryEntry>(`${API_CONFIG.baseUrl}/api/diary/entries`, entry);
  }
  
  deleteEntry(entryId: string): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/api/diary/entries/${entryId}`);
  }
}
