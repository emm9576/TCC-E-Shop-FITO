// src/services/api.js
const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  // Verificar se o token está expirado
  isTokenExpired() {
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    if (!tokenExpiry) return true;
    
    const now = new Date();
    const expiryDate = new Date(tokenExpiry);
    return now >= expiryDate;
  }

  // Configurar cabeçalhos padrão
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.token && !this.isTokenExpired()) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Método genérico para fazer requisições
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(options.requireAuth !== false),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Verificar se há um novo token no header de resposta (refresh automático)
      const newToken = response.headers.get('X-New-Token');
      if (newToken) {
        this.setToken(newToken);
        
        // Atualizar também a data de expiração
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 1); // 1 dia
        localStorage.setItem('tokenExpiry', newExpiry.toISOString());
      }
      
      const data = await response.json();

      if (!response.ok) {
        // Se erro 401, token pode estar expirado
        if (response.status === 401) {
          this.setToken(null);
          localStorage.removeItem('user');
          localStorage.removeItem('tokenExpiry');
          
          // Se não for uma rota de login/signup, rejeitar com erro específico
          if (!endpoint.includes('/login') && !endpoint.includes('/signup')) {
            throw new Error('Sessão expirada. Faça login novamente.');
          }
        }
        
        throw new Error(data.message || `Erro HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      
      // Tratar erros de rede
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Erro de conexão. Verifique se o servidor está rodando.');
      }
      
      throw error;
    }
  }

  // Atualizar token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // ========================
  // ACCOUNT ROUTES
  // ========================

  async signup(userData) {
    return this.request('/account/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
      requireAuth: false,
    });
  }

  async login(credentials) {
    const response = await this.request('/account/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      requireAuth: false,
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async logout() {
    try {
      await this.request('/account/logout', {
        method: 'POST',
      });
    } finally {
      this.setToken(null);
    }
  }

  async deleteAccount(password) {
    const response = await this.request('/account/delete-account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
    
    this.setToken(null);
    return response;
  }

  async makeAdmin(email, secretCode) {
    return this.request('/account/make-admin', {
      method: 'POST',
      body: JSON.stringify({ email, secretCode }),
      requireAuth: false,
    });
  }

  // ========================
  // USERS ROUTES
  // ========================

  async getMe() {
    return this.request('/users/me');
  }

  async getAllUsers() {
    return this.request('/users');
  }

  async getUserById(id) {
    return this.request(`/users/${id}`);
  }

  async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // ========================
  // PRODUCTS ROUTES
  // ========================

  async getProducts(params = {}) {
    const searchParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, params[key]);
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/produtos${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint, { requireAuth: false });
  }

  async getProductById(id) {
    return this.request(`/produtos/${id}`, { requireAuth: false });
  }

  async createProduct(productData) {
    return this.request('/produtos', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(id, productData) {
    return this.request(`/produtos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  }

  async updateProductRating(id, rating) {
    return this.request(`/produtos/${id}/rating`, {
      method: 'PATCH',
      body: JSON.stringify({ rating }),
    });
  }

  async deleteProduct(id) {
    return this.request(`/produtos/${id}`, {
      method: 'DELETE',
    });
  }

  async getProductsBySeller(seller) {
    return this.request(`/produtos/seller/${seller}`, { requireAuth: false });
  }

  async getProductsByCategory(category) {
    return this.request(`/produtos/category/${category}`, { requireAuth: false });
  }

  async getProductsWithFreeShipping() {
    return this.request('/produtos/frete-gratis', { requireAuth: false });
  }

  async getMyProducts() {
    return this.request('/produtos/my-products', { requireAuth: true });
  }

  // ========================
  // BUY ROUTES
  // ========================

  async buyProduct(productId, quantity = 1) {
    return this.request(`/buy/${productId}`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    });
  }

  // ========================
  // ORDERS ROUTES
  // ========================

  async getAllOrders(params = {}) {
    const searchParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, params[key]);
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/orders${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }

  async getOrderById(id) {
    return this.request(`/orders/${id}`);
  }

  async getOrdersByUser(userId) {
    return this.request(`/orders/user/${userId}`);
  }

  async updateOrder(id, orderData) {
    return this.request(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    });
  }

  async updateOrderStatus(id, status) {
    return this.request(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteOrder(id) {
    return this.request(`/orders/${id}`, {
      method: 'DELETE',
    });
  }

  async getOrdersByStatus(status) {
    return this.request(`/orders/status/${status}`);
  }
}

// Criar instância única do serviço
const apiService = new ApiService();

export default apiService;