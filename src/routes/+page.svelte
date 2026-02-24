<script>
	import { onMount } from 'svelte';
	import { addToast } from '$lib/stores/toast';

	export let data;
	let username = '';
	let password = '';

	// Focus the first input field on load
	onMount(() => {
		document.getElementById('username')?.focus();
	});

	async function login() {
		// Validate inputs before sending request (Improved)
		if (!username.trim() || !password.trim()) {
			addToast('Por favor, complete todos los campos.', 'error');
			return;
		}

		if (username.length < 3 || username.length > 50) {
			addToast('El usuario debe tener entre 3 y 50 caracteres.', 'error');
			return;
		}

		if (password.length < 4 || password.length > 100) {
			addToast('La contraseña debe tener entre 4 y 100 caracteres.', 'error');
			return;
		}

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ username: username.toLowerCase(), password })
			});

			const result = await response.json();

			if (response.ok && result.status === 'success') {
				if (result.data.user.debe_cambiar_pin) {
					addToast('Necesitas cambiar tu PIN. Redirigiendo...', 'warning');
					setTimeout(() => {
						window.location.href = '/change-pin';
					}, 1500);
					return;
				}

				addToast('Login exitoso! Redirigiendo...', 'success');
				setTimeout(() => {
					window.location.href = '/menu';
				}, 1500);
			} else {
				addToast(result.error?.message || 'Credenciales incorrectas. Intente nuevamente.', 'error');
			}
		} catch (err) {
			addToast('Un error ha ocurrido. Favor intente nuevamente.', 'error');
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-100">
	<div class="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
		<h2 class="text-2xl font-bold text-gray-800">Toma de Inventario</h2>
		{#if data?.environmentLabel}
			<div class="mb-4 text-right text-sm font-semibold text-red-600">
				{data.environmentLabel}
			</div>
		{:else}
			<div class="mb-4"></div>
		{/if}

		<form on:submit|preventDefault={login} class="space-y-4" aria-live="polite">
			<div>
				<label for="username" class="block text-sm font-medium text-gray-700">Usuario</label>
				<input
					type="text"
					id="username"
					bind:value={username}
					placeholder="Ingrese su usuario"
					maxlength="50"
					class="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					required
				/>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-gray-700">Contraseña</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					placeholder="Ingrese su contraseña"
					class="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					required
					autocomplete="off"
				/>
			</div>

			<button
				type="submit"
				class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			>
				Login
			</button>
		</form>
	</div>
</div>
