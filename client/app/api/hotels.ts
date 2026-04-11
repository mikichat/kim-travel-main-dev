import axios from 'axios';
import type { ApiResponse } from '@tourworld/shared';
import type { Hotel } from '../mocks/data/hotels';

const API_BASE_URL = '/api';

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface GetHotelsParams {
  page?: number;
  pageSize?: number;
  location?: string;
  minRating?: number;
  maxPrice?: number;
  search?: string;
}

/**
 * Get all hotels with optional filters
 */
export async function getHotels(
  params: GetHotelsParams = {}
): Promise<ApiResponse<Hotel[]>> {
  const response = await api.get<ApiResponse<Hotel[]>>('/hotels', { params });
  return response.data;
}

/**
 * Get a single hotel by ID
 */
export async function getHotelById(id: string): Promise<ApiResponse<Hotel>> {
  const response = await api.get<ApiResponse<Hotel>>(`/hotels/${id}`);
  return response.data;
}

/**
 * Create a new hotel
 */
export async function createHotel(
  hotel: Partial<Hotel>
): Promise<ApiResponse<Hotel>> {
  const response = await api.post<ApiResponse<Hotel>>('/hotels', hotel);
  return response.data;
}

/**
 * Update an existing hotel
 */
export async function updateHotel(
  id: string,
  hotel: Partial<Hotel>
): Promise<ApiResponse<Hotel>> {
  const response = await api.put<ApiResponse<Hotel>>(`/hotels/${id}`, hotel);
  return response.data;
}

/**
 * Delete a hotel
 */
export async function deleteHotel(id: string): Promise<ApiResponse<void>> {
  const response = await api.delete<ApiResponse<void>>(`/hotels/${id}`);
  return response.data;
}
