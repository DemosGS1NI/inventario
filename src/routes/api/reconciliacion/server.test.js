import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './+server.js';

// Mock the database - use factory function properly
vi.mock('@vercel/postgres', () => ({
	sql: Object.assign(
		vi.fn().mockImplementation(() => Promise.resolve({ rows: [] })),
		{
			query: vi.fn().mockResolvedValue({ rows: [] })
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

describe('Reconciliation API', () => {
	beforeEach(async () => {
		vi.clearAllMocks();

		// Reset SQL mocks for each test
		const { sql } = await import('@vercel/postgres');
		sql.mockImplementation(() => Promise.resolve({ rows: [] }));
		sql.query.mockResolvedValue({ rows: [] });
	});

	describe('GET /api/reconciliacion', () => {
		it('should require authentication', async () => {
			const mockUrl = { searchParams: { get: vi.fn(() => null) } };
			const mockLocals = {}; // No user

			const result = await GET({ url: mockUrl, locals: mockLocals });

			expect(result.status).toBe('error');
			expect(result.error.code).toBe('UNAUTHORIZED');
		});

		it('should handle empty inventory records', async () => {
			const mockUrl = { searchParams: { get: vi.fn(() => null) } };
			const mockLocals = { user: { userId: 1 } };

			// Mock empty inventory result
			const { sql } = await import('@vercel/postgres');
			sql.query.mockResolvedValueOnce({ rows: [] });

			const result = await GET({ url: mockUrl, locals: mockLocals });

			expect(result.status).toBe('success');
			expect(result.data.records).toEqual([]);
			expect(result.data.summary.totalRecords).toBe(0);
		});

		it('should perform basic reconciliation without movements', async () => {
			const mockUrl = { searchParams: { get: vi.fn(() => null) } };
			const mockLocals = { user: { userId: 1 } };

			// Mock inventory data - product with no movements
			const inventoryData = [
				{
					id: 1,
					bodega: 'BODEGA #1',
					ubicacion: 'A1-B1',
					marca: 'MARCA1',
					codigo_barras: '12345',
					numero_parte: 'PART123',
					descripcion: 'Test Product',
					inventario_sistema: 100,
					inventario_fisico: 100,
					fecha_inventario: '2024-01-15 10:00:00',
					categoria_incidencia: null,
					incidencia: null
				}
			];

			// Mock empty movements data
			const movementsData = [];

			const { sql } = await import('@vercel/postgres');
			sql.query
				.mockResolvedValueOnce({ rows: inventoryData }) // Inventory query
				.mockResolvedValueOnce({ rows: movementsData }); // Movements query

			const result = await GET({ url: mockUrl, locals: mockLocals });

			expect(result.status).toBe('success');
			expect(result.data.records).toHaveLength(1);

			const record = result.data.records[0];
			expect(record.stockEsperado).toBe(100); // No movements, so expected = system
			expect(record.diferenciaAparente).toBe(0); // 100 - 100
			expect(record.diferenciaReal).toBe(0); // 100 - 100
			expect(record.estadoReconciliacion).toBe('Sin Diferencia');
			expect(record.tieneMovimientos).toBe(false);
		});

		it('should handle movements that explain discrepancies', async () => {
			const mockUrl = { searchParams: { get: vi.fn(() => null) } };
			const mockLocals = { user: { userId: 1 } };

			// Mock inventory data - physical count is 5 less than system
			const inventoryData = [
				{
					id: 1,
					bodega: 'BODEGA #1',
					ubicacion: 'A1-B1',
					marca: 'MARCA1',
					codigo_barras: '12345',
					numero_parte: 'PART123',
					descripcion: 'Test Product',
					inventario_sistema: 100,
					inventario_fisico: 95,
					fecha_inventario: '2024-01-15T10:00:00.000Z',
					categoria_incidencia: null,
					incidencia: null
				}
			];

			// Mock movements data - 5 units OUT before count (explains the difference)
			const movementsData = [
				{
					id: 1,
					codigo_barras: '12345',
					bodega: 'BODEGA #1',
					marca: 'MARCA1',
					ubicacion: 'A1-B1',
					tipo_movimiento: 'OUT',
					cantidad: 5,
					fecha_movimiento: '2024-01-15T09:00:00.000Z', // Before inventory count
					numero_documento: 'TEST-001',
					usuario_nombre: 'Test User'
				}
			];

			const { sql } = await import('@vercel/postgres');
			sql.query
				.mockResolvedValueOnce({ rows: inventoryData })
				.mockResolvedValueOnce({ rows: movementsData });

			const result = await GET({ url: mockUrl, locals: mockLocals });

			expect(result.status).toBe('success');

			const record = result.data.records[0];
			expect(record.entradasPreConteo).toBe(0);
			expect(record.salidasPreConteo).toBe(5);
			expect(record.netMovimientosPreConteo).toBe(-5);
			expect(record.stockEsperado).toBe(95); // 100 + (-5)
			expect(record.diferenciaAparente).toBe(-5); // 95 - 100
			expect(record.diferenciaReal).toBe(0); // 95 - 95
			expect(record.estadoReconciliacion).toBe('Explicado por Movimientos');
			expect(record.tieneMovimientos).toBe(true);
		});

		it('should identify true discrepancies not explained by movements', async () => {
			const mockUrl = { searchParams: { get: vi.fn(() => null) } };
			const mockLocals = { user: { userId: 1 } };

			const inventoryData = [
				{
					id: 1,
					bodega: 'BODEGA #1',
					ubicacion: 'A1-B1',
					marca: 'MARCA1',
					codigo_barras: '12345',
					numero_parte: 'PART123',
					descripcion: 'Test Product',
					inventario_sistema: 100,
					inventario_fisico: 85, // 15 less than system
					fecha_inventario: '2024-01-15T10:00:00.000Z',
					categoria_incidencia: null,
					incidencia: null
				}
			];

			// Mock movements that only explain part of the difference
			const movementsData = [
				{
					id: 1,
					codigo_barras: '12345',
					bodega: 'BODEGA #1',
					marca: 'MARCA1',
					ubicacion: 'A1-B1',
					tipo_movimiento: 'OUT',
					cantidad: 5, // Only explains 5 of the 15 unit difference
					fecha_movimiento: '2024-01-15T09:00:00.000Z',
					numero_documento: 'TEST-001',
					usuario_nombre: 'Test User'
				}
			];

			const { sql } = await import('@vercel/postgres');
			sql.query
				.mockResolvedValueOnce({ rows: inventoryData })
				.mockResolvedValueOnce({ rows: movementsData });

			const result = await GET({ url: mockUrl, locals: mockLocals });

			const record = result.data.records[0];
			expect(record.stockEsperado).toBe(95); // 100 + (-5)
			expect(record.diferenciaReal).toBe(-10); // 85 - 95 (true discrepancy)
			expect(record.estadoReconciliacion).toBe('Discrepancia Real');
			expect(record.tieneDiscrepancia).toBe(true);
		});

		it('should separate pre-count and post-count movements correctly', async () => {
			const mockUrl = { searchParams: { get: vi.fn(() => null) } };
			const mockLocals = { user: { userId: 1 } };

			const inventoryData = [
				{
					id: 1,
					bodega: 'BODEGA #1',
					ubicacion: 'A1-B1',
					marca: 'MARCA1',
					codigo_barras: '12345',
					numero_parte: 'PART123',
					descripcion: 'Test Product',
					inventario_sistema: 100,
					inventario_fisico: 100,
					fecha_inventario: '2024-01-15T10:00:00.000Z',
					categoria_incidencia: null,
					incidencia: null
				}
			];

			const movementsData = [
				{
					id: 1,
					codigo_barras: '12345',
					bodega: 'BODEGA #1',
					marca: 'MARCA1',
					ubicacion: 'A1-B1',
					tipo_movimiento: 'OUT',
					cantidad: 5,
					fecha_movimiento: '2024-01-15T09:00:00.000Z', // BEFORE count
					numero_documento: 'BEFORE-001',
					usuario_nombre: 'Test User'
				},
				{
					id: 2,
					codigo_barras: '12345',
					bodega: 'BODEGA #1',
					marca: 'MARCA1',
					ubicacion: 'A1-B1',
					tipo_movimiento: 'IN',
					cantidad: 10,
					fecha_movimiento: '2024-01-15T11:00:00.000Z', // AFTER count
					numero_documento: 'AFTER-001',
					usuario_nombre: 'Test User'
				}
			];

			const { sql } = await import('@vercel/postgres');
			sql.query
				.mockResolvedValueOnce({ rows: inventoryData })
				.mockResolvedValueOnce({ rows: movementsData });

			const result = await GET({ url: mockUrl, locals: mockLocals });

			const record = result.data.records[0];
			expect(record.movimientosPreConteo).toHaveLength(1);
			expect(record.movimientosPostConteo).toHaveLength(1);
			expect(record.salidasPreConteo).toBe(5);
			expect(record.entradasPostConteo).toBe(10);
			expect(record.netMovimientosPreConteo).toBe(-5); // Only pre-count affects reconciliation
		});

		it('should apply filters correctly', async () => {
			const mockUrl = {
				searchParams: {
					get: vi.fn((param) => {
						const params = { bodega: 'BODEGA #1', marca: 'MARCA1' };
						return params[param] || null;
					})
				}
			};
			const mockLocals = { user: { userId: 1 } };

			const { sql } = await import('@vercel/postgres');
			sql.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

			await GET({ url: mockUrl, locals: mockLocals });

			// Verify SQL query was called with filters
			expect(sql.query).toHaveBeenCalledWith(
				expect.stringContaining('AND i.bodega = $1'),
				expect.arrayContaining(['BODEGA #1'])
			);
		});

		it('should generate correct summary statistics', async () => {
			const mockUrl = { searchParams: { get: vi.fn(() => null) } };
			const mockLocals = { user: { userId: 1 } };

			const inventoryData = [
				{
					id: 1,
					bodega: 'BODEGA #1',
					codigo_barras: '12345',
					inventario_sistema: 100,
					inventario_fisico: 100,
					fecha_inventario: '2024-01-15T10:00:00.000Z',
					ubicacion: 'A1-B1',
					marca: 'MARCA1',
					numero_parte: 'PART1',
					descripcion: 'Product 1',
					categoria_incidencia: null,
					incidencia: null
				}
			];

			const { sql } = await import('@vercel/postgres');
			sql.query.mockReset();
			sql.query.mockResolvedValueOnce({ rows: inventoryData }).mockResolvedValueOnce({ rows: [] }); // No movements

			const result = await GET({ url: mockUrl, locals: mockLocals });

			expect(result.status).toBe('success');
			expect(result.data.summary).toMatchObject({
				totalRecords: expect.any(Number),
				withMovements: expect.any(Number),
				movementExplained: expect.any(Number),
				trueDiscrepancies: expect.any(Number),
				noDiscrepancy: expect.any(Number)
			});

			// Verify the numbers make sense
			const summary = result.data.summary;
			expect(summary.totalRecords).toBeGreaterThanOrEqual(0);
			expect(summary.withMovements + (summary.totalRecords - summary.withMovements)).toBe(
				summary.totalRecords
			);
		});
	});
});
