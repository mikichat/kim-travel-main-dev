// js/modules/api.js

const API_BASE_URL = '/tables';

async function request(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }
    if (response.status === 204) {
      // No Content
      return null;
    }
    return response.json();
  } catch (error) {
    console.error(`API request to ${endpoint} failed:`, error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Generic API functions
export const getTableData = (tableName, queryParams = '') =>
  request(`${tableName}?${queryParams}`);
export const createTableData = (tableName, data) =>
  request(tableName, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const updateTableData = (tableName, id, data) =>
  request(`${tableName}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const patchTableData = (tableName, id, data) =>
  request(`${tableName}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const deleteTableData = (tableName, id) =>
  request(`${tableName}/${id}`, { method: 'DELETE' });

// Specific file upload helper
export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
