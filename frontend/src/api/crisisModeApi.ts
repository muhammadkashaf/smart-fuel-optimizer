import api from './axios';
import type { CrisisRecommendationsResponse } from '@/types';

export const getCrisisMode = () => api.get<{ enabled: boolean }>('/crisis-mode');
export const setCrisisMode = (enabled: boolean) => api.put<{ enabled: boolean; message: string }>('/crisis-mode', { enabled });
export const getCrisisRecommendations = () => api.get<CrisisRecommendationsResponse>('/crisis-mode/recommendations');
