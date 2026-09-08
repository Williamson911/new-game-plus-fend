export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  username: string;
  email: string;
}

export interface AuthResponse {
  token: string;
}

export interface RegisterResponse {
  id: string;
  username: string;
}

export interface ConfirmResponse {
  username: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface MeResponse {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface JwtClaims {
  sub: string;
  id: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}
