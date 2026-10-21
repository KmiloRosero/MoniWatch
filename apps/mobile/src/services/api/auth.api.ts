import { apiRequest } from './http-client';
import type { AuthResponse, LoginRequest, RegisterRequest, SetPaymentPinRequest, UserProfile } from './types';

export const authApi = {
  login(body: LoginRequest) {
    return apiRequest<AuthResponse>('/auth/login', { method: 'POST', body, authenticated: false });
  },

  register(body: RegisterRequest) {
    return apiRequest<AuthResponse>('/auth/register', { method: 'POST', body, authenticated: false });
  },

  logout() {
    return apiRequest<void>('/auth/logout', { method: 'POST' });
  },

  getProfile() {
    return apiRequest<UserProfile>('/auth/me');
  },

  setPaymentPin(body: SetPaymentPinRequest) {
    return apiRequest<void>('/auth/payment-pin', { method: 'PUT', body });
  },
};
