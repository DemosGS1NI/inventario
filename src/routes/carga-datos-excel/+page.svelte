<!-- src/routes/carga-datos-excel/+page.svelte -->
<script>
	import BacktoMenu from '$lib/BackToMenu.svelte';
	import { addToast } from '$lib/stores/toast';

	let file = null;
	let isLoading = false;
	let showError = false;
	let errorMessage = '';

	const downloadTemplate = () => {
		const link = document.createElement('a');
		link.href = '/plantilla_inventario.xlsx';
		link.download = 'plantilla_inventario.xlsx';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const uploadFile = async () => {
		if (!file) {
			addToast('Seleccione un archivo', 'error');
			return;
		}

		isLoading = true;

		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch('/api/carga-datos-excel', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (response.ok) {
				addToast(result.message, 'success');
				file = null;
				document.getElementById('file-input').value = '';
			} else {
				errorMessage = result.error?.message || 'Error en la importación';
				showError = true;
			}
		} catch (error) {
			errorMessage = 'Error de conexión';
			showError = true;
		} finally {
			isLoading = false;
		}
	};

	const closeError = () => {
		showError = false;
		errorMessage = '';
	};
</script>

<div class="flex min-h-screen flex-col items-center bg-gray-100 px-4 py-6">
	<h1 class="mb-6 text-center text-2xl font-bold">Carga Datos Excel</h1>

	<BacktoMenu />

	<div class="mb-6 w-full max-w-md rounded-lg bg-white p-6 shadow-md">
		<div class="mb-4 flex justify-end">
			<button
				on:click={downloadTemplate}
				type="button"
				class="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
			>
				Descarga la Plantilla
			</button>
		</div>

		<!-- Warning -->
		<div class="mb-4 rounded border border-red-200 bg-red-50 p-3">
			<p class="text-sm text-red-700">
				<strong>Atención:</strong> Esto reemplazará todos los datos existentes.
			</p>
		</div>

		<!-- File Input -->
		<label for="file-input" class="mb-2 block text-sm font-medium text-gray-700">
			Archivo Excel (.xlsx)
		</label>

		<div class="relative mb-4">
			<input
				id="file-input"
				type="file"
				accept=".xlsx"
				on:change={(e) => (file = e.target.files[0])}
				disabled={isLoading}
				class="hidden"
			/>
			<label
				for="file-input"
				class="block w-full cursor-pointer rounded border border-gray-300 bg-white px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
				class:opacity-50={isLoading}
				class:cursor-not-allowed={isLoading}
			>
				{file ? file.name : 'Seleccione el archivo'}
			</label>
		</div>

		<!-- Upload Button -->
		<button
			on:click={uploadFile}
			disabled={isLoading || !file}
			class="w-full rounded bg-blue-500 px-4 py-3 font-medium text-white hover:bg-blue-600 disabled:bg-gray-400"
		>
			{#if isLoading}
				<span>Procesando...</span>
			{:else}
				<span>Importar Datos</span>
			{/if}
		</button>
	</div>

	<!-- Error Modal -->
	{#if showError}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
			<div class="w-full max-w-md rounded-lg bg-white shadow-xl">
				<div class="border-b border-gray-200 bg-red-50 px-6 py-4">
					<h3 class="text-lg font-semibold text-red-800">Error en la Importación</h3>
				</div>
				<div class="px-6 py-4">
					<p class="break-words text-sm text-gray-700">{errorMessage}</p>
				</div>
				<div class="flex justify-center border-t border-gray-200 px-6 py-4">
					<button
						on:click={closeError}
						class="rounded bg-blue-500 px-6 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						OK
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
