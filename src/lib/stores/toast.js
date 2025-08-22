// src/lib/stores/toast.js
import { writable } from 'svelte/store';

export const toastStore = writable([]);

export function addToast(message, type = 'info', duration = 2000) {
	const id = Math.random().toString(36).substring(2);
	toastStore.update((toasts) => [...toasts, { id, message, type }]);
	setTimeout(() => {
		removeToast(id);
	}, duration);
}

export function removeToast(id) {
	toastStore.update((toasts) => toasts.filter((toast) => toast.id !== id));
}
