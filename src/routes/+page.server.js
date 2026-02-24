import { DATA } from '$env/static/private';

export function load() {
	return {
		environmentLabel: DATA || null
	};
}