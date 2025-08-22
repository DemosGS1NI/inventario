// src/tests/authorization.test.js
import { describe, it, expect, vi } from 'vitest';
import { getUserAuthorizations, getAuthorizationStats } from '$lib/services/authorizationService';

// Mock the database module
vi.mock('$lib/database', () => ({
	sql: vi.fn()
}));

describe('Authorization Service', () => {
	it('should format user authorizations correctly', async () => {
		// Mock sql function
		const mockSql = vi.fn().mockResolvedValue({
			rows: [
				{
					id: 1,
					application_id: 10,
					app_name: 'Test App',
					app_description: 'Test Description',
					website_url: 'https://test.com',
					logo_url: null,
					scopes: ['read:profile', 'read:inventory'],
					granted_at: '2025-01-01T00:00:00Z',
					last_used_at: '2025-01-01T12:00:00Z',
					expires_at: '2025-01-02T00:00:00Z',
					is_active: true
				}
			]
		});

		// Replace the sql import in the module
		const { sql } = await import('$lib/database');
		sql.mockImplementation(mockSql);

		const result = await getUserAuthorizations(1);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual(
			expect.objectContaining({
				id: 1,
				applicationId: 10,
				applicationName: 'Test App',
				description: 'Test Description',
				websiteUrl: 'https://test.com',
				logoUrl: null,
				scopes: ['read:profile', 'read:inventory'],
				isActive: true
			})
		);
	});

	it('should return authorization stats correctly', async () => {
		const mockSql = vi.fn().mockResolvedValue({
			rows: [
				{
					total_authorizations: '5',
					used_authorizations: '3',
					active_authorizations: '4'
				}
			]
		});

		const { sql } = await import('$lib/database');
		sql.mockImplementation(mockSql);

		const result = await getAuthorizationStats(1);

		expect(result).toEqual({
			totalAuthorizations: 5,
			usedAuthorizations: 3,
			activeAuthorizations: 4
		});
	});

	it('should handle database errors gracefully', async () => {
		const mockSql = vi.fn().mockRejectedValue(new Error('Database connection failed'));

		const { sql } = await import('$lib/database');
		sql.mockImplementation(mockSql);

		await expect(getUserAuthorizations(1)).rejects.toThrow('Database connection failed');
	});
});
