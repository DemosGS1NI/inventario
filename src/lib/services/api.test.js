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

	describe('fetchBodegas', () => {
		it('should fetch bodegas successfully', async () => {
			const mockBodegas = ['BODEGA #1', 'BODEGA #2'];
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					status: 'success',
					data: mockBodegas
				})
			});

			const result = await inventoryAPI.fetchBodegas();

			expect(result.data).toEqual(mockBodegas);
			expect(mockFetch).toHaveBeenCalledWith('/api/inventario/fetch-bodegas', {
				headers: {
					'Content-Type': 'application/json'
				}
			});
		});

		it('should handle fetch bodegas error', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					status: 'error',
					error: {
						code: 'FETCH_ERROR',
						message: 'Failed to fetch bodegas'
					}
				})
			});

			const result = await inventoryAPI.fetchBodegas();

			expect(result.status).toBe('error');
			expect(result.error.code).toBe('FETCH_ERROR');
		});
	});

	describe('fetchMarcas', () => {
		it('should fetch marcas successfully with bodega parameter', async () => {
			const mockMarcas = ['MARCA1', 'MARCA2'];
			const bodega = 'BODEGA #1';

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					status: 'success',
					data: mockMarcas
				})
			});

			const result = await inventoryAPI.fetchMarcas(bodega);

			expect(result.data).toEqual(mockMarcas);
			expect(mockFetch).toHaveBeenCalledWith('/api/inventario/fetch-marcas?bodega=BODEGA+%231', {
				headers: {
					'Content-Type': 'application/json'
				}
			});
		});

		it('should not fetch marcas if no bodega provided', async () => {
			const result = await inventoryAPI.fetchMarcas('');

			expect(result).toBeUndefined();
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should not fetch marcas if null bodega provided', async () => {
			const result = await inventoryAPI.fetchMarcas(null);

			expect(result).toBeUndefined();
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe('fetchCategoriasIncidencias', () => {
		it('should fetch categorias incidencias successfully', async () => {
			const mockCategorias = [{ categoria: 'Categoria 1' }, { categoria: 'Categoria 2' }];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					status: 'success',
					data: mockCategorias
				})
			});

			const result = await inventoryAPI.fetchCategoriasIncidencias();

			expect(result.data).toEqual(mockCategorias);
			expect(mockFetch).toHaveBeenCalledWith('/api/db/categorias-incidencias', {
				headers: {
					'Content-Type': 'application/json'
				}
			});
		});
	});

	describe('fetchProductDetails', () => {
		it('should fetch product details successfully', async () => {
			const mockProduct = {
				id: 1,
				codigo_barras: '12345',
				numero_parte: 'PART123',
				descripcion: 'Test Product',
				inventario_sistema: 100,
				inventario_fisico: 95
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					status: 'success',
					data: mockProduct
				})
			});

			const result = await inventoryAPI.fetchProductDetails('BODEGA #1', 'MARCA1', '12345');

			expect(result.status).toBe('success');
			expect(result.data).toEqual([mockProduct]);
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/inventario/registro?bodega=BODEGA+%231&codigo_barras=12345&marca=MARCA1',
				{
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
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

			const result = await inventoryAPI.fetchProductDetails('BODEGA #1', 'MARCA1', 'Code123');

			expect(result.status).toBe('error');
			expect(result.error.code).toBe('NOT_FOUND');
		});

		it('should handle fetchProductDetails with null marca', async () => {
			const mockProduct = {
				id: 1,
				codigo_barras: '12345',
				numero_parte: 'PART123'
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					status: 'success',
					data: mockProduct
				})
			});

			const result = await inventoryAPI.fetchProductDetails('BODEGA #1', null, '12345');

			expect(result.status).toBe('success');
			// Should not include marca parameter when null
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/inventario/registro?bodega=BODEGA+%231&codigo_barras=12345',
				{
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		});

		it('should handle network error in fetchProductDetails', async () => {
			const networkError = new Error('Network error');
			mockFetch.mockRejectedValueOnce(networkError);

			const result = await inventoryAPI.fetchProductDetails('BODEGA #1', 'MARCA1', '12345');

			expect(result.status).toBe('error');
			expect(result.error.code).toBe('EXCEPTION');
			expect(result.error.message).toBe('Network error');
		});
	});

	describe('saveProduct', () => {
		it('should save product successfully', async () => {
			const formData = {
				id: 1,
				inventario_fisico: 95,
				categoria_incidencia: 'Test Category',
				incidencia: 'Test notes'
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					status: 'success',
					data: { id: 1 },
					message: 'Product updated successfully'
				})
			});

			const result = await inventoryAPI.saveProduct(formData);

			expect(result.status).toBe('success');
			expect(mockFetch).toHaveBeenCalledWith('/api/inventario/registro', {
				method: 'PUT',
				body: JSON.stringify(formData),
				headers: {
					'Content-Type': 'application/json'
				}
			});
		});

		it('should handle save product error', async () => {
			const formData = {
				id: 1,
				inventario_fisico: 95
			};

			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					status: 'error',
					error: {
						code: 'SAVE_ERROR',
						message: 'Failed to save product'
					}
				})
			});

			const result = await inventoryAPI.saveProduct(formData);

			expect(result.status).toBe('error');
			expect(result.error.code).toBe('SAVE_ERROR');
		});
	});

	describe('error handling', () => {
		it('should handle network errors gracefully', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network failure'));

			// This should not throw, but handle the error gracefully
			await expect(inventoryAPI.fetchBodegas()).rejects.toThrow('Network failure');
		});

		it('should handle malformed JSON response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => {
					throw new Error('Invalid JSON');
				}
			});

			await expect(inventoryAPI.fetchBodegas()).rejects.toThrow('Invalid JSON');
		});
	});
});
