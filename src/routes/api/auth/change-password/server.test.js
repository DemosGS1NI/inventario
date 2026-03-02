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

const { POST } = await import('./+server.js');

describe('POST /api/auth/change-password', () => {
	let mockSql, mockBcrypt, mockSuccess, mockError;

	beforeEach(async () => {
		vi.clearAllMocks();
		mockSql = (await import('$lib/database')).sql;
		mockBcrypt = (await import('bcryptjs')).default || (await import('bcryptjs'));
		({ successResponse: mockSuccess, errorResponse: mockError } = await import(
			'$lib/responseUtils'
		));
		mockSuccess.mockImplementation((data, msg) => new Response(JSON.stringify({ status: 'success', data, message: msg }), { status: 200 }));
		mockError.mockImplementation((status, code, msg) => new Response(JSON.stringify({ status: 'error', error: { code, message: msg } }), { status }));
	});

	it('changes password when inputs are valid and user is authenticated', async () => {
		mockBcrypt.hash.mockResolvedValue('hashed');
		mockSql.mockResolvedValue({ rowCount: 1, rows: [{ id: 1, username: 'u' }] });

		const request = new Request('http://localhost/api/auth/change-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ newPassword: 'abcd', confirmNewPassword: 'abcd' })
		});

		const response = await POST({ request, locals: { user: { userId: 1 } } });

		expect(mockBcrypt.hash).toHaveBeenCalledWith('abcd', 12);
		expect(mockSql).toHaveBeenCalled();
		expect(response.status).toBe(200);
	});

	it('rejects when passwords do not match', async () => {
		const request = new Request('http://localhost/api/auth/change-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ newPassword: 'abcd', confirmNewPassword: 'wxyz' })
		});

		const response = await POST({ request, locals: { user: { userId: 1 } } });
		expect(response.status).toBe(400);
		expect(mockSql).not.toHaveBeenCalled();
	});

	it('rejects when user is not authenticated', async () => {
		const request = new Request('http://localhost/api/auth/change-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ newPassword: 'abcd', confirmNewPassword: 'abcd' })
		});

		const response = await POST({ request, locals: {} });
		expect(response.status).toBe(401);
	});
});
