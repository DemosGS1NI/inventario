/**
 * Formats a date string to a localized format (DD-MMM-YY HH:MM:SS AM/PM)
 * @param {string|null} dateString - ISO date string or null
 * @returns {string} Formatted date string or empty string if input is null
 * @example
 * formatDateTime('2024-01-13T14:30:45+06:00') // Returns '13-ENE-24 02:30:45 PM'
 */
export function formatDateTime(dateString) {
	// Handle null, undefined, or empty string
	if (!dateString) return '';

	// Validate input type - only accept strings
	if (typeof dateString !== 'string') return '';

	try {
		const date = new Date(dateString);

		// Check if date is valid
		if (isNaN(date.getTime())) {
			return '';
		}

		// Use UTC methods for consistent behavior across timezones
		const year = date.getUTCFullYear().toString();
		const month = date.getUTCMonth();
		const day = date.getUTCDate().toString().padStart(2, '0');
		let hours = date.getUTCHours();
		const minute = date.getUTCMinutes().toString().padStart(2, '0');
		const second = date.getUTCSeconds().toString().padStart(2, '0');

		// Determine AM/PM
		const ampm = hours >= 12 ? 'PM' : 'AM';

		// Convert to 12-hour format
		hours = hours % 12 || 12;
		hours = hours.toString().padStart(2, '0');

		const months = [
			'ENE',
			'FEB',
			'MAR',
			'ABR',
			'MAY',
			'JUN',
			'JUL',
			'AGO',
			'SEP',
			'OCT',
			'NOV',
			'DIC'
		];

		return `${day}-${months[month]}-${year.slice(-2)} ${hours}:${minute}:${second} ${ampm}`;
	} catch (error) {
		console.error('Error formatting date:', error);
		return '';
	}
}
