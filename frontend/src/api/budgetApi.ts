import api from './axios';
import type { Budget, BudgetSummary } from '@/types';

export const getBudget = (year: number, month: number) =>
  api.get<{ budget: Budget | null }>(`/budgets/${year}/${month}`);

export const getPreviousBudget = (year: number, month: number) =>
  api.get<{ budget: Budget | null }>(`/budgets/${year}/${month}/previous`);

export const putBudget = (year: number, month: number, amount: number) =>
  api.put<{ message: string; budget: Budget }>(`/budgets/${year}/${month}`, { amount });

export const getBudgetSummary = (year: number, month: number) =>
  api.get<BudgetSummary>(`/budgets/${year}/${month}/summary`);
