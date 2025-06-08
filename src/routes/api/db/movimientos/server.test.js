import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from './+server.js';

// Mock the database - use factory function properly
vi.mock('@vercel/postgres', () => ({
  sql: Object.assign(
    vi.fn().mockImplementation(() => Promise.resolve({
      rows: [{ id: 1, fecha_movimiento: new Date() }]
    })),
    {
      query: vi.fn().mockResolvedValue({
        rows: [
          { 
            id: 1, 
            bodega: 'BODEGA #1', 
            marca: 'MARCA1',
            usuario_nombre: 'Test User' 
          }
        ]
      })
    }
  )
}));

// Mock the response utilities
vi.mock('$lib/responseUtils', () => ({
  successResponse: vi.fn((data, message) => ({ 
    status: 'success', 
    data, 
    message 
  })),
  errorResponse: vi.fn((code, errorCode, message) => ({ 
    status: 'error', 
    error: { code: errorCode, message } 
  }))
}));

describe('Movimientos API', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked sql and reset it
    const { sql } = await import('@vercel/postgres');
    sql.mockImplementation(() => Promise.resolve({
      rows: [{ id: 1, fecha_movimiento: new Date() }]
    }));
    
    sql.query.mockResolvedValue({
      rows: [
        { 
          id: 1, 
          bodega: 'BODEGA #1', 
          marca: 'MARCA1',
          usuario_nombre: 'Test User' 
        }
      ]
    });
  });

  describe('POST /api/db/movimientos', () => {
    it('should create movement with valid data', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          bodega: 'BODEGA #1',
          marca: 'MARCA1',
          codigo_barras: '12345',
          tipo_movimiento: 'IN',
          cantidad: 10
        })
      };

      const mockLocals = {
        user: { userId: 1 }
      };

      const result = await POST({ request: mockRequest, locals: mockLocals });
      
      expect(result.status).toBe('success');
    });

    it('should reject invalid tipo_movimiento', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          bodega: 'BODEGA #1',
          marca: 'MARCA1', 
          codigo_barras: '12345',
          tipo_movimiento: 'INVALID',
          cantidad: 10
        })
      };

      const mockLocals = {
        user: { userId: 1 }
      };

      const result = await POST({ request: mockRequest, locals: mockLocals });
      
      expect(result.status).toBe('error');
      expect(result.error.message).toContain('IN o OUT');
    });

    it('should reject negative quantity', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          bodega: 'BODEGA #1',
          marca: 'MARCA1',
          codigo_barras: '12345', 
          tipo_movimiento: 'IN',
          cantidad: -5
        })
      };

      const mockLocals = {
        user: { userId: 1 }
      };

      const result = await POST({ request: mockRequest, locals: mockLocals });
      
      expect(result.status).toBe('error');
      expect(result.error.message).toContain('positivo');
    });

    it('should require authentication', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({})
      };

      const mockLocals = {}; // No user

      const result = await POST({ request: mockRequest, locals: mockLocals });
      
      expect(result.status).toBe('error');
      expect(result.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/db/movimientos', () => {
    it('should fetch movements with filters', async () => {
      const mockUrl = {
        searchParams: {
          get: vi.fn((param) => {
            const params = { bodega: 'BODEGA #1', marca: 'MARCA1' };
            return params[param] || null;
          })
        }
      };

      const mockLocals = {
        user: { userId: 1 }
      };

      const result = await GET({ url: mockUrl, locals: mockLocals });
      
      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
    });
  });
});