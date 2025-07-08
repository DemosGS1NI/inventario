/**
 * Formats a date string to a localized format (DD-MMM-YY HH:MM:SS AM/PM) in GMT-6 timezone
 * @param {string|null} dateString - ISO date string or null
 * @returns {string} Formatted date string or empty string if input is null
 * @example
 * formatDateTime('2024-01-13T14:30:45.000Z') // Returns '13-ENE-24 08:30:45 AM' (GMT-6)
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

		// Apply GMT-6 offset (subtract 6 hours)
		const utcTime = date.getTime();
		const gmt6Time = new Date(utcTime - 6 * 60 * 60 * 1000);

		// Get components in GMT-6
		const year = gmt6Time.getUTCFullYear().toString();
		const month = gmt6Time.getUTCMonth();
		const day = gmt6Time.getUTCDate().toString().padStart(2, '0');
		let hours = gmt6Time.getUTCHours();
		const minute = gmt6Time.getUTCMinutes().toString().padStart(2, '0');
		const second = gmt6Time.getUTCSeconds().toString().padStart(2, '0');

		// Determine AM/PM
		const ampm = hours >= 12 ? 'PM' : 'AM';

		// Convert to 12-hour format
		hours = hours % 12 || 12;
		const formattedHours = hours.toString().padStart(2, '0');

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

		return `${day}-${months[month]}-${year.slice(-2)} ${formattedHours}:${minute}:${second} ${ampm}`;
	} catch (error) {
		console.error('Error formatting date:', error);
		return '';
	}
}
