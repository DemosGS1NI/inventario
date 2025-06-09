// src/routes/api/auth/login/server.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies BEFORE any imports
vi.mock('@vercel/postgres', () => ({
  sql: vi.fn()
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn()
  },
  compare: vi.fn()
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn()
  },
  sign: vi.fn()
}));

vi.mock('dotenv', () => ({
  default: {
    config: vi.fn()
  },
  config: vi.fn()
}));

vi.mock('$lib/jwt', () => ({
  jwtConfig: {
    secret: 'test-secret',
    getSignOptions: vi.fn(() => ({ 
      expiresIn: '1h', 
      issuer: 'test-issuer', 
      audience: 'test-audience' 
    })),
    createAuthCookie: vi.fn(() => 'jwt=mock-token; HttpOnly; Secure')
  }
}));

vi.mock('$lib/responseUtils', () => ({
  successResponse: vi.fn(),
  errorResponse: vi.fn()
}));

// Setup global crypto mock
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123')
  }
});

// Now import the module under test
const { POST } = await import('./+server.js');

describe('POST /api/auth/login', () => {
  let mockSql, mockBcrypt, mockJwt, mockSuccessResponse, mockErrorResponse;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked functions
    const { sql } = await import('@vercel/postgres');
    mockSql = sql;
    
    const bcrypt = await import('bcrypt');
    mockBcrypt = bcrypt.default || bcrypt;
    
    const jwt = await import('jsonwebtoken');
    mockJwt = jwt.default || jwt;
    
    const { successResponse, errorResponse } = await import('$lib/responseUtils');
    mockSuccessResponse = successResponse;
    mockErrorResponse = errorResponse;
    
    // Setup default response mocks
    mockSuccessResponse.mockImplementation((data, message, options) => {
      return new Response(JSON.stringify({ 
        status: 'success', 
        data, 
        message 
      }), {
        status: 200,
        headers: options?.headers || {}
      });
    });
    
    mockErrorResponse.mockImplementation((status, code, message) => {
      return new Response(JSON.stringify({ 
        status: 'error', 
        error: { code, message } 
      }), {
        status
      });
    });
  });

  describe('Successful login scenarios', () => {
    it('should login successfully with valid credentials', async () => {
      // Setup mocks
      const mockUser = {
        id: 1,
        pin_hash: '$2b$12$hashedpin',
        activo: true,
        debe_cambiar_pin: false,
        nombre: 'Test User',
        nombre_rol: 'Admin'
      };

      mockSql.mockResolvedValueOnce({
        rows: [mockUser]
      });

      mockBcrypt.compare.mockResolvedValueOnce(true);
      mockJwt.sign.mockReturnValueOnce('mock-jwt-token');

      // Create request
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_telefono: '12345678',
          pin: '1234'
        })
      });

      const mockGetClientAddress = vi.fn(() => '127.0.0.1');

      // Execute
      await POST({ 
        request, 
        getClientAddress: mockGetClientAddress 
      });

      // Verify database query was called
      expect(mockSql).toHaveBeenCalled();

      // Verify password comparison
      expect(mockBcrypt.compare).toHaveBeenCalledWith('1234', '$2b$12$hashedpin');

      // Verify JWT creation
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          userName: 'Test User',
          userRole: 'Admin',
          jti: 'mock-uuid-123'
        }),
        'test-secret',
        expect.objectContaining({
          expiresIn: '1h'
        })
      );

      // Verify successful response
      expect(mockSuccessResponse).toHaveBeenCalledWith(
        { user: { debe_cambiar_pin: false } },
        'Login successful!',
        { headers: { 'Set-Cookie': 'jwt=mock-token; HttpOnly; Secure' } }
      );
    });

    it('should handle user that needs PIN change', async () => {
      const mockUser = {
        id: 2,
        pin_hash: '$2b$12$hashedpin',
        activo: true,
        debe_cambiar_pin: true,
        nombre: 'New User',
        nombre_rol: 'Inventario'
      };

      mockSql.mockResolvedValueOnce({
        rows: [mockUser]
      });

      mockBcrypt.compare.mockResolvedValueOnce(true);
      mockJwt.sign.mockReturnValueOnce('mock-jwt-token');

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_telefono: '87654321',
          pin: '0000'
        })
      });

      const mockGetClientAddress = vi.fn(() => '127.0.0.1');

      await POST({ request, getClientAddress: mockGetClientAddress });

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        { user: { debe_cambiar_pin: true } },
        'Login successful!',
        { headers: { 'Set-Cookie': 'jwt=mock-token; HttpOnly; Secure' } }
      );
    });
  });

  describe('Authentication failures', () => {
    it('should reject invalid phone number', async () => {
      mockSql.mockResolvedValueOnce({ rows: [] });

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_telefono: '99999999',
          pin: '1234'
        })
      });

      const mockGetClientAddress = vi.fn(() => '127.0.0.1');

      await POST({ request, getClientAddress: mockGetClientAddress });

      expect(mockErrorResponse).toHaveBeenCalledWith(
        401, 
        'INVALID_CREDENTIALS', 
        'Numero de Telefono o PIN invalido'
      );

      expect(mockBcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwt.sign).not.toHaveBeenCalled();
    });

    it('should reject incorrect PIN', async () => {
      const mockUser = {
        id: 1,
        pin_hash: '$2b$12$hashedpin',
        activo: true,
        debe_cambiar_pin: false,
        nombre: 'Test User',
        nombre_rol: 'Admin'
      };

      mockSql.mockResolvedValueOnce({
        rows: [mockUser]
      });

      mockBcrypt.compare.mockResolvedValueOnce(false);

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_telefono: '12345678',
          pin: 'wrongpin'
        })
      });

      const mockGetClientAddress = vi.fn(() => '127.0.0.1');

      await POST({ request, getClientAddress: mockGetClientAddress });

      expect(mockBcrypt.compare).toHaveBeenCalledWith('wrongpin', '$2b$12$hashedpin');
      expect(mockErrorResponse).toHaveBeenCalledWith(
        401, 
        'INVALID_CREDENTIALS', 
        'Numero de Telefono o PIN invalido'
      );
      expect(mockJwt.sign).not.toHaveBeenCalled();
    });

    it('should reject inactive user account', async () => {
      const mockUser = {
        id: 1,
        pin_hash: '$2b$12$hashedpin',
        activo: false, // Inactive user
        debe_cambiar_pin: false,
        nombre: 'Inactive User',
        nombre_rol: 'Admin'
      };

      mockSql.mockResolvedValueOnce({
        rows: [mockUser]
      });

      mockBcrypt.compare.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_telefono: '12345678',
          pin: '1234'
        })
      });

      const mockGetClientAddress = vi.fn(() => '127.0.0.1');

      await POST({ request, getClientAddress: mockGetClientAddress });

      expect(mockBcrypt.compare).toHaveBeenCalled();
      expect(mockErrorResponse).toHaveBeenCalledWith(
        403, 
        'ACCOUNT_INACTIVE', 
        'La cuenta esta Inactivada'
      );
      expect(mockJwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('Input validation', () => {
    it('should reject missing phone number', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: '1234'
        })
      });

      const mockGetClientAddress = vi.fn(() => '127.0.0.1');

      await POST({ request, getClientAddress: mockGetClientAddress });

      expect(mockErrorResponse).toHaveBeenCalledWith(
        400, 
        'VALIDATION_ERROR', 
        'Numero de Telefono y Pin son requeridos'
      );
      expect(mockSql).not.toHaveBeenCalled();
    });

    it('should reject missing PIN', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_telefono: '12345678'
        })
      });

      const mockGetClientAddress = vi.fn(() => '127.0.0.1');

      await POST({ request, getClientAddress: mockGetClientAddress });

      expect(mockErrorResponse).toHaveBeenCalledWith(
        400, 
        'VALIDATION_ERROR', 
        'Numero de Telefono y Pin son requeridos'
      );
      expect(mockSql).not.toHaveBeenCalled();
    });

    it('should reject empty fields', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_telefono: '',
          pin: ''
        })
      });

      const mockGetClientAddress = vi.fn(() => '127.0.0.1');

      await POST({ request, getClientAddress: mockGetClientAddress });

      expect(mockErrorResponse).toHaveBeenCalledWith(
        400, 
        'VALIDATION_ERROR', 
        'Numero de Telefono y Pin son requeridos'
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_telefono: '12345678',
          pin: '1234'
        })
      });

      const mockGetClientAddress = vi.fn(() => '127.0.0.1');

      await POST({ request, getClientAddress: mockGetClientAddress });

      expect(mockErrorResponse).toHaveBeenCalledWith(
        500,
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred during login'
      );
    });

    it('should handle malformed JSON request', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      const mockGetClientAddress = vi.fn(() => '127.0.0.1');

      await POST({ request, getClientAddress: mockGetClientAddress });

      expect(mockErrorResponse).toHaveBeenCalledWith(
        500,
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred during login'
      );
    });
  });

  describe('Security considerations', () => {
    it('should not expose sensitive user information in response', async () => {
      const mockUser = {
        id: 1,
        pin_hash: '$2b$12$hashedpin',
        activo: true,
        debe_cambiar_pin: false,
        nombre: 'Test User',
        nombre_rol: 'Admin'
      };

      mockSql.mockResolvedValueOnce({ rows: [mockUser] });
      mockBcrypt.compare.mockResolvedValueOnce(true);
      mockJwt.sign.mockReturnValueOnce('mock-jwt-token');

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_telefono: '12345678',
          pin: '1234'
        })
      });

      const mockGetClientAddress = vi.fn(() => '127.0.0.1');

      await POST({ request, getClientAddress: mockGetClientAddress });

      // Verify only debe_cambiar_pin is exposed, not sensitive data
      expect(mockSuccessResponse).toHaveBeenCalledWith(
        { user: { debe_cambiar_pin: false } },
        'Login successful!',
        expect.any(Object)
      );
      
      // Verify sensitive data is NOT exposed by checking the actual call
      const successCall = mockSuccessResponse.mock.calls[0];
      const responseData = successCall[0];
      
      expect(responseData.user).not.toHaveProperty('pin_hash');
      expect(responseData.user).not.toHaveProperty('id');
      expect(responseData.user).not.toHaveProperty('nombre');
      expect(responseData.user).toHaveProperty('debe_cambiar_pin');
    });
  });
});