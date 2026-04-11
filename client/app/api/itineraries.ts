import axios from 'axios';
import type { ApiResponse, Tour } from '@tourworld/shared';

const API_BASE_URL = '/api';

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface GetToursParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export interface ApiError {
  error: string;
}

/**
 * Fetch all tours with pagination and filters
 */
export async function getTours(
  params: GetToursParams = {}
): Promise<ApiResponse<Tour[]>> {
  const response = await api.get<ApiResponse<Tour[]>>('/tours', { params });
  return response.data;
}

/**
 * Fetch single tour by ID
 */
export async function getTourById(id: string): Promise<ApiResponse<Tour>> {
  const response = await api.get<ApiResponse<Tour>>(`/tours/${id}`);
  return response.data;
}

/**
 * Create new tour
 */
export async function createTour(
  data: Partial<Tour>
): Promise<ApiResponse<Tour>> {
  const response = await api.post<ApiResponse<Tour>>('/tours', data);
  return response.data;
}

/**
 * Update tour
 */
export async function updateTour(
  id: string,
  data: Partial<Tour>
): Promise<ApiResponse<Tour>> {
  const response = await api.put<ApiResponse<Tour>>(`/tours/${id}`, data);
  return response.data;
}

/**
 * Delete tour
 */
export async function deleteTour(id: string): Promise<void> {
  await api.delete(`/tours/${id}`);
}

/**
 * Helper to extract error message from API response
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    return apiError?.error || error.message || 'An unexpected error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
