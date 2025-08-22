<script>
	import { goto } from '$app/navigation';
	import BackToMenu from '$lib/BackToMenu.svelte';
	import { addToast } from '$lib/stores/toast';

	let newPin = '';
	let confirmNewPin = '';

	const validateInputs = () => {
		// Trim inputs to avoid blank spaces
		newPin = newPin.trim();
		confirmNewPin = confirmNewPin.trim();

		// Check for empty inputs
		if (!newPin || !confirmNewPin) {
			addToast('Todos los campos son obligatorios.', 'error');
			return false;
		}

		// Check for mismatched PINs
		if (newPin !== confirmNewPin) {
			addToast('Los PINs no coinciden.', 'error');
			return false;
		}

		// Clear any previous error state (no longer needed with toast)
		return true;
	};

	const changePin = async () => {
		// Validate inputs before sending request
		if (!validateInputs()) return;

		try {
			console.log(newPin, confirmNewPin);

			const response = await fetch('/api/auth/change-pin', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					newPin,
					confirmNewPin
				})
			});

			if (response.ok) {
				addToast('¡PIN ha sido cambiado satisfactoriamente!', 'success');
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
		on:submit|preventDefault={changePin}
	>
		<h2 class="mb-4 text-center text-2xl font-bold">Cambiar PIN</h2>

		<BackToMenu />

		<div class="mb-4">
			<label for="newPin" class="mb-2 block font-medium text-gray-700">
				Ingrese su nuevo PIN:
			</label>
			<input
				type="password"
				id="newPin"
				class="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				bind:value={newPin}
			/>
		</div>
		<div class="mb-4">
			<label for="confirmNewPin" class="mb-2 block font-medium text-gray-700">
				Confirme su nuevo PIN:
			</label>
			<input
				type="password"
				id="confirmNewPin"
				class="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				bind:value={confirmNewPin}
			/>
		</div>

		<button
			type="submit"
			class="w-full rounded-lg bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600"
		>
			Cambiar PIN
		</button>
	</form>
</div>
