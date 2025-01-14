// src/lib/utils/dateFormat.test.js
import { describe, it, expect } from 'vitest';
import { formatDateTime } from './dateFormat';

describe('formatDateTime', () => {
    it('should format PM time correctly with timezone', () => {
        const date = '2024-01-13 14:30:45+06';
        expect(formatDateTime(date)).toBe('13-ENE-24 02:30:45 PM');
    });

    it('should format AM time correctly with timezone', () => {
        const date = '2024-01-13 09:30:45+06';
        expect(formatDateTime(date)).toBe('13-ENE-24 09:30:45 AM');
    });

    it('should format noon correctly with timezone', () => {
        const date = '2024-01-13 12:00:00+06';
        expect(formatDateTime(date)).toBe('13-ENE-24 12:00:00 PM');
    });

    it('should format midnight correctly with timezone', () => {
        // Note: using same date format as the database
        const date = '2024-01-13 00:30:45+06';
        expect(formatDateTime(date)).toBe('13-ENE-24 12:30:45 AM');
    });

    it('should handle times after noon correctly', () => {
        const date = '2024-01-13 18:53:53+06';
        expect(formatDateTime(date)).toBe('13-ENE-24 06:53:53 PM');
    });

    it('should handle edge case around midnight', () => {
        const date = '2024-01-13 00:00:00+06';
        expect(formatDateTime(date)).toBe('13-ENE-24 12:00:00 AM');
    });

    it('should handle empty input', () => {
        expect(formatDateTime('')).toBe('');
        expect(formatDateTime(null)).toBe('');
        expect(formatDateTime(undefined)).toBe('');
    });

    it('should handle invalid date', () => {
        expect(formatDateTime('invalid-date')).toBe('');
    });
});