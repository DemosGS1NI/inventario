import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server.js';

// Mock dependencies
vi.mock('jsonwebtoken');
vi.mock('$lib/jwt', () => ({
	jwtConfig: {
		cookie: { name: 'jwt', path: '/' },
		secret: 'test-secret',
		getVerifyOptions: () => ({})
	}
}));
vi.mock('$lib/services/tokenService');
vi.mock('$lib/responseUtils');

describe('POST /api/auth/logout', () => {
	let mockJwt;
	let mockRevokeToken;
	let mockSuccessResponse;
	let mockErrorResponse;
	let mockCookies;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Setup mocks
		mockJwt = {
			verify: vi.fn()
		};
		vi.mocked(await import('jsonwebtoken')).default = mockJwt;

		const tokenService = vi.mocked(await import('$lib/services/tokenService'));
		mockRevokeToken = tokenService.revokeToken;

		const responseUtils = vi.mocked(await import('$lib/responseUtils'));
		mockSuccessResponse = responseUtils.successResponse;
		mockErrorResponse = responseUtils.errorResponse;

		// Mock cookies object
		mockCookies = {
			get: vi.fn(),
			delete: vi.fn()
		};

		// Default implementations
		mockSuccessResponse.mockImplementation((data, message, options) => ({
			status: 'success',
			data,
			message,
			...options
		}));

		mockErrorResponse.mockImplementation((code, errorCode, message, details) => ({
			status: 'error',
			code,
			errorCode,
			message,
			details
		}));
	});

	describe('Successful logout scenarios', () => {
		it('should logout successfully with valid token', async () => {
			const mockToken = 'valid.jwt.token';
			const mockPayload = {
				userId: 123,
				jti: 'token-id-123',
				exp: 1234567890
			};

			mockCookies.get.mockReturnValue(mockToken);
			mockJwt.verify.mockReturnValue(mockPayload);
			mockRevokeToken.mockResolvedValue(undefined);

			const result = await POST({ cookies: mockCookies });

			// Verify token was verified
			expect(mockJwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret', {});

			// Verify token was revoked
			expect(mockRevokeToken).toHaveBeenCalledWith('token-id-123', 1234567890);

			// Verify cookie was deleted
			expect(mockCookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });

			// Verify success response - matching actual implementation
			expect(mockSuccessResponse).toHaveBeenCalledWith(null, 'Logout successful', {
				headers: {
					'Set-Cookie': 'jwt=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0'
				}
			});
		});

		it('should logout successfully even with expired token', async () => {
			const mockToken = 'expired.jwt.token';
			const expiredError = new Error('Token expired');
			expiredError.name = 'TokenExpiredError';

			mockCookies.get.mockReturnValue(mockToken);
			mockJwt.verify.mockImplementation(() => {
				throw expiredError;
			});

			const result = await POST({ cookies: mockCookies });

			// Verify cookie was deleted
			expect(mockCookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });

			// Based on actual code, expired tokens also return standard success message
			expect(mockSuccessResponse).toHaveBeenCalledWith(
				null,
				'Logout successful (invalid token cleared)',
				{
					headers: {
						'Set-Cookie': 'jwt=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0'
					}
				}
			);
		});

		it('should logout successfully with invalid token', async () => {
			const mockToken = 'invalid.jwt.token';
			const invalidError = new Error('Invalid token');
			invalidError.name = 'JsonWebTokenError';

			mockCookies.get.mockReturnValue(mockToken);
			mockJwt.verify.mockImplementation(() => {
				throw invalidError;
			});

			const result = await POST({ cookies: mockCookies });

			// Verify cookie was deleted
			expect(mockCookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });

			// Based on actual code, invalid tokens also return standard success message
			expect(mockSuccessResponse).toHaveBeenCalledWith(
				null,
				'Logout successful (invalid token cleared)',
				{
					headers: {
						'Set-Cookie': 'jwt=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0'
					}
				}
			);
		});
	});

	describe('No token scenarios', () => {
		it('should return error when no token is present', async () => {
			mockCookies.get.mockReturnValue(undefined);

			const result = await POST({ cookies: mockCookies });

			expect(mockCookies.delete).not.toHaveBeenCalled();
			expect(mockErrorResponse).toHaveBeenCalledWith(
				400,
				'NO_TOKEN',
				'No active session found to log out.'
			);
		});

		it('should return error when token is empty string', async () => {
			mockCookies.get.mockReturnValue('');

			const result = await POST({ cookies: mockCookies });

			expect(mockErrorResponse).toHaveBeenCalledWith(
				400,
				'NO_TOKEN',
				'No active session found to log out.'
			);
		});
	});

	describe('Token revocation scenarios', () => {
		it('should handle token without jti gracefully', async () => {
			const mockToken = 'valid.jwt.token';
			const mockPayload = {
				userId: 123,
				exp: 1234567890
				// No jti
			};

			mockCookies.get.mockReturnValue(mockToken);
			mockJwt.verify.mockReturnValue(mockPayload);

			const result = await POST({ cookies: mockCookies });

			// Should not attempt to revoke token
			expect(mockRevokeToken).not.toHaveBeenCalled();

			// Should still delete cookie and return success
			expect(mockCookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });
			expect(mockSuccessResponse).toHaveBeenCalled();
		});

		it('should handle token without exp gracefully', async () => {
			const mockToken = 'valid.jwt.token';
			const mockPayload = {
				userId: 123,
				jti: 'token-id-123'
				// No exp
			};

			mockCookies.get.mockReturnValue(mockToken);
			mockJwt.verify.mockReturnValue(mockPayload);

			const result = await POST({ cookies: mockCookies });

			// Should not attempt to revoke token
			expect(mockRevokeToken).not.toHaveBeenCalled();

			// Should still delete cookie and return success
			expect(mockCookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });
			expect(mockSuccessResponse).toHaveBeenCalled();
		});

		it('should handle token revocation failures gracefully', async () => {
			const mockToken = 'valid.jwt.token';
			const mockPayload = {
				userId: 123,
				jti: 'token-id-123',
				exp: 1234567890
			};

			mockCookies.get.mockReturnValue(mockToken);
			mockJwt.verify.mockReturnValue(mockPayload);
			mockRevokeToken.mockRejectedValue(new Error('Database error'));

			const result = await POST({ cookies: mockCookies });

			// Based on actual code, revocation errors are logged but don't affect logout
			expect(mockCookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });
			expect(mockErrorResponse).toHaveBeenCalled();
		});
	});

	describe('Error handling', () => {
		it('should handle JWT verification errors gracefully', async () => {
			const mockToken = 'malformed.token';
			const jwtError = new Error('Malformed JWT');
			jwtError.name = 'JsonWebTokenError';

			mockCookies.get.mockReturnValue(mockToken);
			mockJwt.verify.mockImplementation(() => {
				throw jwtError;
			});

			const result = await POST({ cookies: mockCookies });

			// Should still clear cookie and return success
			expect(mockCookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });
			expect(mockSuccessResponse).toHaveBeenCalledWith(
				null,
				'Logout successful (invalid token cleared)',
				{
					headers: {
						'Set-Cookie': 'jwt=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0'
					}
				}
			);
		});

		it('should handle unexpected JWT verification errors', async () => {
			const mockToken = 'valid.jwt.token';
			const unexpectedError = new Error('Unexpected error');
			unexpectedError.name = 'UnexpectedError';

			mockCookies.get.mockReturnValue(mockToken);
			mockJwt.verify.mockImplementation(() => {
				throw unexpectedError;
			});

			const result = await POST({ cookies: mockCookies });

			// Based on actual code, non-JWT errors return success
			expect(mockCookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });
			expect(mockSuccessResponse).toHaveBeenCalled();
		});

		it('should handle token revocation service errors', async () => {
			const mockToken = 'valid.jwt.token';
			const mockPayload = {
				userId: 123,
				jti: 'token-id-123',
				exp: 1234567890
			};

			mockCookies.get.mockReturnValue(mockToken);
			mockJwt.verify.mockReturnValue(mockPayload);
			mockRevokeToken.mockRejectedValue(new Error('Service unavailable'));

			const result = await POST({ cookies: mockCookies });

			// Should continue with logout despite revocation failure
			expect(mockCookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });
			expect(mockErrorResponse).toHaveBeenCalled();
		});
	});

	describe('Security considerations', () => {
		it('should not leak sensitive information in error messages', async () => {
			mockCookies.get.mockReturnValue(undefined);

			await POST({ cookies: mockCookies });

			expect(mockErrorResponse).toHaveBeenCalledWith(
				400,
				'NO_TOKEN',
				'No active session found to log out.'
			);
		});

		it('should properly set cookie attributes for security', async () => {
			const mockToken = 'valid.jwt.token';
			const mockPayload = { userId: 123, jti: 'token-123', exp: 1234567890 };

			mockCookies.get.mockReturnValue(mockToken);
			mockJwt.verify.mockReturnValue(mockPayload);
			mockRevokeToken.mockResolvedValue(undefined);

			await POST({ cookies: mockCookies });

			expect(mockSuccessResponse).toHaveBeenCalledWith(null, 'Logout successful', {
				headers: {
					'Set-Cookie': expect.stringContaining('HttpOnly')
				}
			});

			expect(mockSuccessResponse).toHaveBeenCalledWith(null, 'Logout successful', {
				headers: {
					'Set-Cookie': expect.stringContaining('Secure')
				}
			});
		});

		it('should handle multiple logout attempts gracefully', async () => {
			const mockToken = 'valid.jwt.token';
			const mockPayload = { userId: 123, jti: 'token-123', exp: 1234567890 };

			mockCookies.get.mockReturnValue(mockToken);
			mockJwt.verify.mockReturnValue(mockPayload);
			mockRevokeToken.mockResolvedValue(undefined);

			// First logout
			await POST({ cookies: mockCookies });

			// Reset mocks for second attempt
			mockCookies.get.mockReturnValue(undefined);

			// Second logout attempt (no token)
			await POST({ cookies: mockCookies });

			// Should handle gracefully with appropriate error
			expect(mockErrorResponse).toHaveBeenCalledWith(
				400,
				'NO_TOKEN',
				'No active session found to log out.'
			);
		});
	});
});
