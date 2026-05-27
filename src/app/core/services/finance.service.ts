import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface FinanceCategory {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  user_id?: string;
}

export interface FinanceSubcategory {
  id: string;
  category_id: string;
  name: string;
}

export interface FinanceTransaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string;
  subcategory_id?: string;
  transaction_date: string;
  payment_method: string;
  description?: string;
  category_name?: string;
  subcategory_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private http = inject(HttpClient);
  
  getCategories(type?: 'income' | 'expense' | 'both'): Observable<FinanceCategory[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<FinanceCategory[]>(`${API_CONFIG.baseUrl}/api/finance/categories`, { params });
  }
  
  createCategory(category: { name: string; type: 'income' | 'expense' | 'both' }): Observable<FinanceCategory> {
    return this.http.post<FinanceCategory>(`${API_CONFIG.baseUrl}/api/finance/categories`, category);
  }
  
  getSubcategories(categoryId: string): Observable<FinanceSubcategory[]> {
    return this.http.get<FinanceSubcategory[]>(`${API_CONFIG.baseUrl}/api/finance/subcategories/${categoryId}`);
  }
  
  createSubcategory(subcategory: { category_id: string; name: string }): Observable<FinanceSubcategory> {
    return this.http.post<FinanceSubcategory>(`${API_CONFIG.baseUrl}/api/finance/subcategories`, subcategory);
  }
  
  getTransactions(filters?: {
    start_date?: string;
    end_date?: string;
    category_id?: string;
    type?: 'income' | 'expense';
  }): Observable<FinanceTransaction[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.start_date) params = params.set('start_date', filters.start_date);
      if (filters.end_date) params = params.set('end_date', filters.end_date);
      if (filters.category_id) params = params.set('category_id', filters.category_id);
      if (filters.type) params = params.set('type', filters.type);
    }
    return this.http.get<FinanceTransaction[]>(`${API_CONFIG.baseUrl}/api/finance/transactions`, { params });
  }
  
  logTransaction(transaction: {
    amount: number;
    type: 'income' | 'expense';
    category_id: string;
    subcategory_id?: string;
    transaction_date: string;
    payment_method: string;
    description?: string;
  }): Observable<FinanceTransaction> {
    return this.http.post<FinanceTransaction>(`${API_CONFIG.baseUrl}/api/finance/transactions`, transaction);
  }
  
  deleteTransaction(transactionId: string): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/api/finance/transactions/${transactionId}`);
  }
}
