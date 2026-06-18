import api from './api';

export const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore — clear client state regardless */ }
    localStorage.removeItem('user');
  },

  logoutAll: async () => {
    try {
      await api.post('/auth/logout-all');
    } catch { /* ignore */ }
    localStorage.removeItem('user');
  },

  refresh: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  resendVerification: async (email) => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  getActiveSessions: async () => {
    const response = await api.get('/auth/sessions');
    return response.data;
  },
};

export const productService = {
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getProductById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/products/categories/all');
    return response.data;
  },
};

export const orderService = {
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  createPaymentPreference: async (orderId) => {
    const response = await api.post(`/payments/create-preference/${orderId}`);
    return response.data;
  },

  getOrderById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  getMyOrders: async () => {
    const response = await api.get('/orders/myorders');
    return response.data;
  },

  getAllOrders: async (params = {}) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  updateOrderStatus: async (id, status) => {
    const response = await api.put(`/orders/${id}/status`, { status });
    return response.data;
  },
};

export const userService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
};

export const uploadService = {
  uploadImage: async (file, isProfile = false) => {
    const formData = new FormData();
    formData.append('image', file);
    const endpoint = isProfile ? '/upload/profile' : '/upload';
    const response = await api.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadMultipleImages: async (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    const response = await api.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export const transactionService = {
  getAll: async (params = {}) => {
    const response = await api.get('/transactions', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/transactions', data);
    return response.data;
  },

  getSummary: async (params = {}) => {
    const response = await api.get('/transactions/summary', { params });
    return response.data;
  },
};
