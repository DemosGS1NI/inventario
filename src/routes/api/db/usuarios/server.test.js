import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/database', () => ({
	sql: vi.fn()
}));

vi.mock('bcryptjs', () => ({
	default: {
		hash: vi.fn()
	},
	hash: vi.fn()
}));

vi.mock('$lib/responseUtils', () => ({
	successResponse: vi.fn(),
	errorResponse: vi.fn()
}));

vi.mock('$lib/constants.js', () => ({
	AUTH: { BCRYPT_ROUNDS: 12 }
}));

vi.mock('$lib/authMiddleware', () => ({
	requireAuth: vi.fn(() => ({ userId: 99 })),
	requireAdmin: vi.fn(() => ({ userId: 99 }))
}));

const { POST } = await import('./+server.js');

describe('POST /api/db/usuarios', () => {
	let mockSql, mockBcrypt, mockSuccess, mockError;

	beforeEach(async () => {
		vi.clearAllMocks();
		mockSql = (await import('$lib/database')).sql;
		mockBcrypt = (await import('bcryptjs')).default || (await import('bcryptjs'));
		({ successResponse: mockSuccess, errorResponse: mockError } = await import(
			'$lib/responseUtils'
		));
		mockSuccess.mockImplementation((data, msg, opts) => new Response(JSON.stringify({ status: 'success', data, message: msg }), { status: opts?.status || 200 }));
		mockError.mockImplementation((status, code, msg) => new Response(JSON.stringify({ status: 'error', error: { code, message: msg } }), { status }));
	});

	it('creates a user when input is valid', async () => {
		mockBcrypt.hash.mockResolvedValue('hashed');
		mockSql.mockResolvedValue({
			rows: [{ id: 1, username: 'user', nombre: 'Nombre', apellido: 'Apellido', numero_telefono: '123', rol_id: 2, activo: true, debe_cambiar_pin: false, created_by: 99, updated_by: 99 }]
		});

		const request = new Request('http://localhost/api/db/usuarios', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				nombre: 'Nombre',
				apellido: 'Apellido',
				numero_telefono: '123',
				rol_id: 2,
				username: 'User',
				password: 'secret'
			})
		});

		const response = await POST({ request, locals: { user: { userId: 99 } } });

		expect(mockBcrypt.hash).toHaveBeenCalledWith('secret', 12);
		expect(mockSql).toHaveBeenCalled();
		expect(response.status).toBe(201);
	});

	it('rejects when required fields are missing', async () => {
		const request = new Request('http://localhost/api/db/usuarios', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ nombre: '', apellido: '', numero_telefono: '', rol_id: null, username: '', password: '' })
		});

		const response = await POST({ request, locals: { user: { userId: 99 } } });
		expect(response.status).toBe(400);
		expect(mockSql).not.toHaveBeenCalled();
	});
});
