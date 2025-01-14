// src/lib/services/api.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inventoryAPI } from './api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('inventoryAPI', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('should fetch bodegas successfully', async () => {
        const mockBodegas = ['Bodega 1', 'Bodega 2'];
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                status: 'success',
                data: mockBodegas
            })
        });

        const result = await inventoryAPI.fetchBodegas();
        expect(result.data).toEqual(mockBodegas);
        expect(mockFetch).toHaveBeenCalledWith('/api/bodegas', expect.any(Object));
    });

    it('should handle product not found', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
            json: async () => ({
                status: 'error',
                error: {
                    code: 'NOT_FOUND',
                    message: 'Product not found'
                }
            })
        });

        const result = await inventoryAPI.fetchProductDetails('Bodega', 'Marca', 'Code123');
        expect(result.status).toBe('error'); // Updated to match actual API response
        expect(result.error.code).toBe('NOT_FOUND');
    });
});