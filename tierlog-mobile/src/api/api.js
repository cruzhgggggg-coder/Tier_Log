import axios from 'axios';

// Konfigurasi baseURL backend Go
const API_URL = 'http://localhost:8080/api'; 
const BASE_URL = 'http://localhost:8080';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const login = async (email, password) => {
  return await axios.post(`${BASE_URL}/login`, { email, password });
};

export const register = async (payload) => {
  return await axios.post(`${BASE_URL}/register`, payload);
};

export const getConsultations = async () => {
  return await api.get('/consultation');
};

export const uploadConsultation = async (formData) => {
  return await api.post('/consultation', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const validateFeedback = async (id) => {
  return await api.put(`/feedback/${id}/validate`);
};

export const approveRevision = async (id) => {
  return await api.post(`/consultation/${id}/approve`);
};

export default api;
