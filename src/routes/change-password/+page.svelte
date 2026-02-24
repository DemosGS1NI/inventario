<script>
	import { goto } from '$app/navigation';
	import BackToMenu from '$lib/BackToMenu.svelte';
	import { addToast } from '$lib/stores/toast';

	let newPassword = '';
	let confirmNewPassword = '';

	const validateInputs = () => {
		// Trim inputs to avoid blank spaces
		newPassword = newPassword.trim();
		confirmNewPassword = confirmNewPassword.trim();

		// Check for empty inputs
		if (!newPassword || !confirmNewPassword) {
			addToast('Todos los campos son obligatorios.', 'error');
			return false;
		}

		// Check for mismatched PINs
		if (newPassword !== confirmNewPassword) {
			addToast('Las contraseñas no coinciden.', 'error');
			return false;
		}

		// Clear any previous error state (no longer needed with toast)
		return true;
	};

	const changePassword = async () => {
		// Validate inputs before sending request
		if (!validateInputs()) return;

		try {
			console.log(newPassword, confirmNewPassword);

			const response = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					newPassword,
					confirmNewPassword
				})
			});

			if (response.ok) {
				addToast('¡Contraseña cambiada satisfactoriamente!', 'success');
				setTimeout(() => {
					goto('/menu');
				}, 1500); // Give user time to see the success message
			} else {
				const data = await response.json();
				addToast(data.error?.message || 'Error al cambiar el PIN.', 'error');
			}
		} catch (error) {
			addToast('Ocurrió un error inesperado. Por favor, inténtelo más tarde.', 'error');
		}
	};
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-100">
	<form
		class="w-full max-w-md rounded-lg bg-white p-6 shadow-md"
		on:submit|preventDefault={changePassword}
	>
		<h2 class="mb-4 text-center text-2xl font-bold">Cambiar Contraseña</h2>

		<BackToMenu />

		<div class="mb-4">
			<label for="newPassword" class="mb-2 block font-medium text-gray-700">
				Ingrese su nueva contraseña:
			</label>
			<input
				type="password"
				id="newPassword"
				class="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				bind:value={newPassword}
			/>
		</div>
		<div class="mb-4">
			<label for="confirmNewPassword" class="mb-2 block font-medium text-gray-700">
				Confirme su nueva contraseña:
			</label>
			<input
				type="password"
				id="confirmNewPassword"
				class="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				bind:value={confirmNewPassword}
			/>
		</div>

		<button
			type="submit"
			class="w-full rounded-lg bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600"
		>
			Cambiar Contraseña
		</button>
	</form>
</div>
