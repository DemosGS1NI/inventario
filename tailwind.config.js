import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: '#1E40AF', // Blue
					hover: '#1D4ED8'
				},
				secondary: {
					DEFAULT: '#6B7280', // Gray
					hover: '#4B5563'
				},
				success: '#16A34A', // Green
				error: '#DC2626', // Red
				warning: '#F59E0B' // Yellow
			}
		}
	},
	plugins: [forms]
};
