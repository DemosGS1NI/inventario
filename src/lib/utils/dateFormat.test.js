// src/lib/utils/dateFormat.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatDateTime } from './dateFormat';

describe('formatDateTime', () => {
	beforeEach(() => {
		// Reset any timer mocks before each test
		vi.useRealTimers();
	});

	describe('Valid date formatting', () => {
		it('should format PM time correctly with UTC timezone', () => {
			const date = '2024-01-13T14:30:45.000Z';
			expect(formatDateTime(date)).toBe('13-ENE-24 02:30:45 PM');
		});

		it('should format AM time correctly with UTC timezone', () => {
			const date = '2024-01-13T09:30:45.000Z';
			expect(formatDateTime(date)).toBe('13-ENE-24 09:30:45 AM');
		});

		it('should format noon correctly with UTC timezone', () => {
			const date = '2024-01-13T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('13-ENE-24 12:00:00 PM');
		});

		it('should format midnight correctly with UTC timezone', () => {
			const date = '2024-01-13T00:30:45.000Z';
			expect(formatDateTime(date)).toBe('13-ENE-24 12:30:45 AM');
		});

		it('should handle times after noon correctly', () => {
			const date = '2024-01-13T18:53:53.000Z';
			expect(formatDateTime(date)).toBe('13-ENE-24 06:53:53 PM');
		});

		it('should handle edge case around midnight', () => {
			const date = '2024-01-13T00:00:00.000Z';
			expect(formatDateTime(date)).toBe('13-ENE-24 12:00:00 AM');
		});

		it('should format 11 PM correctly', () => {
			const date = '2024-01-13T23:15:30.000Z';
			expect(formatDateTime(date)).toBe('13-ENE-24 11:15:30 PM');
		});

		it('should format 1 AM correctly', () => {
			const date = '2024-01-13T01:05:15.000Z';
			expect(formatDateTime(date)).toBe('13-ENE-24 01:05:15 AM');
		});
	});

	describe('Date format variations', () => {
		it('should handle ISO date string without milliseconds', () => {
			const date = '2024-01-13T14:30:45Z';
			expect(formatDateTime(date)).toBe('13-ENE-24 02:30:45 PM');
		});

		it('should handle PostgreSQL timestamp format', () => {
			const date = '2024-01-13 14:30:45+00';
			expect(formatDateTime(date)).toBe('13-ENE-24 02:30:45 PM');
		});

		it('should handle date with timezone offset', () => {
			const date = '2024-01-13T14:30:45+06:00';
			expect(formatDateTime(date)).toBe('13-ENE-24 08:30:45 AM');
		});

		it('should handle date with negative timezone offset', () => {
			const date = '2024-01-13T14:30:45-05:00';
			expect(formatDateTime(date)).toBe('13-ENE-24 07:30:45 PM');
		});
	});

	describe('Month abbreviations', () => {
		it('should format January correctly', () => {
			const date = '2024-01-15T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('15-ENE-24 12:00:00 PM');
		});

		it('should format February correctly', () => {
			const date = '2024-02-15T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('15-FEB-24 12:00:00 PM');
		});

		it('should format March correctly', () => {
			const date = '2024-03-15T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('15-MAR-24 12:00:00 PM');
		});

		it('should format April correctly', () => {
			const date = '2024-04-15T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('15-ABR-24 12:00:00 PM');
		});

		it('should format May correctly', () => {
			const date = '2024-05-15T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('15-MAY-24 12:00:00 PM');
		});

		it('should format June correctly', () => {
			const date = '2024-06-15T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('15-JUN-24 12:00:00 PM');
		});

		it('should format July correctly', () => {
			const date = '2024-07-15T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('15-JUL-24 12:00:00 PM');
		});

		it('should format August correctly', () => {
			const date = '2024-08-15T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('15-AGO-24 12:00:00 PM');
		});

		it('should format September correctly', () => {
			const date = '2024-09-15T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('15-SEP-24 12:00:00 PM');
		});

		it('should format October correctly', () => {
			const date = '2024-10-15T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('15-OCT-24 12:00:00 PM');
		});

		it('should format November correctly', () => {
			const date = '2024-11-15T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('15-NOV-24 12:00:00 PM');
		});

		it('should format December correctly', () => {
			const date = '2024-12-15T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('15-DIC-24 12:00:00 PM');
		});
	});

	describe('Year formatting', () => {
		it('should format 2024 as 24', () => {
			const date = '2024-01-13T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('13-ENE-24 12:00:00 PM');
		});

		it('should format 2025 as 25', () => {
			const date = '2025-01-13T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('13-ENE-25 12:00:00 PM');
		});

		it('should format 2030 as 30', () => {
			const date = '2030-01-13T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('13-ENE-30 12:00:00 PM');
		});
	});

	describe('Edge cases and error handling', () => {
		it('should handle empty string input', () => {
			expect(formatDateTime('')).toBe('');
		});

		it('should handle null input', () => {
			expect(formatDateTime(null)).toBe('');
		});

		it('should handle undefined input', () => {
			expect(formatDateTime(undefined)).toBe('');
		});

		it('should handle invalid date string', () => {
			expect(formatDateTime('invalid-date')).toBe('');
		});

		it('should handle malformed ISO string', () => {
			expect(formatDateTime('2024-13-45T25:70:80')).toBe('');
		});

		it('should handle non-string input', () => {
			expect(formatDateTime(123)).toBe('');
			expect(formatDateTime({})).toBe('');
			expect(formatDateTime([])).toBe('');
		});

		it('should handle very old dates', () => {
			const date = '1900-01-01T00:00:00.000Z';
			expect(formatDateTime(date)).toBe('01-ENE-00 12:00:00 AM');
		});

		it('should handle leap year dates', () => {
			const date = '2024-02-29T12:00:00.000Z';
			expect(formatDateTime(date)).toBe('29-FEB-24 12:00:00 PM');
		});
	});

	describe('Time precision', () => {
		it('should handle single digit hours', () => {
			const date = '2024-01-13T03:05:07.000Z';
			expect(formatDateTime(date)).toBe('13-ENE-24 03:05:07 AM');
		});

		it('should handle single digit minutes', () => {
			const date = '2024-01-13T15:05:07.000Z';
			expect(formatDateTime(date)).toBe('13-ENE-24 03:05:07 PM');
		});

		it('should handle single digit seconds', () => {
			const date = '2024-01-13T15:25:07.000Z';
			expect(formatDateTime(date)).toBe('13-ENE-24 03:25:07 PM');
		});

		it('should handle zero padding correctly', () => {
			const date = '2024-01-01T01:01:01.000Z';
			expect(formatDateTime(date)).toBe('01-ENE-24 01:01:01 AM');
		});
	});

	describe('Real-world database scenarios', () => {
		it('should handle PostgreSQL timestamp without timezone', () => {
			const date = '2024-01-13 14:30:45';
			// This will be interpreted as local time, but should still format properly
			const result = formatDateTime(date);
			expect(result).toMatch(/^\d{2}-[A-Z]{3}-\d{2} \d{2}:\d{2}:\d{2} (AM|PM)$/);
		});

		it('should handle PostgreSQL timestamp with timezone info', () => {
			const date = '2024-01-13 14:30:45+00:00';
			expect(formatDateTime(date)).toBe('13-ENE-24 02:30:45 PM');
		});

		it('should handle timestamp from API response', () => {
			const date = '2024-01-13T14:30:45.123Z';
			expect(formatDateTime(date)).toBe('13-ENE-24 02:30:45 PM');
		});
	});

	describe('Spanish month abbreviations validation', () => {
		const months = [
			{ month: 1, abbr: 'ENE', name: 'Enero' },
			{ month: 2, abbr: 'FEB', name: 'Febrero' },
			{ month: 3, abbr: 'MAR', name: 'Marzo' },
			{ month: 4, abbr: 'ABR', name: 'Abril' },
			{ month: 5, abbr: 'MAY', name: 'Mayo' },
			{ month: 6, abbr: 'JUN', name: 'Junio' },
			{ month: 7, abbr: 'JUL', name: 'Julio' },
			{ month: 8, abbr: 'AGO', name: 'Agosto' },
			{ month: 9, abbr: 'SEP', name: 'Septiembre' },
			{ month: 10, abbr: 'OCT', name: 'Octubre' },
			{ month: 11, abbr: 'NOV', name: 'Noviembre' },
			{ month: 12, abbr: 'DIC', name: 'Diciembre' }
		];

		months.forEach(({ month, abbr, name }) => {
			it(`should use correct Spanish abbreviation for ${name}`, () => {
				const date = `2024-${month.toString().padStart(2, '0')}-15T12:00:00.000Z`;
				const result = formatDateTime(date);
				expect(result).toContain(abbr);
			});
		});
	});
});
