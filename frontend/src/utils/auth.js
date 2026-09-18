import axios from 'axios';

const BACKEND_URL = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const authAPI = {
  register: async (data) => {
    const response = await axios.post(`${API}/auth/register`, data);
    return response.data;
  },
  
  login: async (data) => {
    const response = await axios.post(`${API}/auth/login`, data);
    return response.data;
  },
  
  getProfile: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
