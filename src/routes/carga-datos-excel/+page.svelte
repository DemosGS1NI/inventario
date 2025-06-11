<script>
	import { onDestroy } from 'svelte';
	import BacktoMenu from '$lib/BackToMenu.svelte';
	import { addToast } from '$lib/stores/toast';

	let file = null;
	let isLoading = false;
	let uploadError = null;
	let uploadSuccess = null;
	let showTableNotEmpty = false;
	let existingRecordCount = 0;

	const uploadFile = async () => {
		if (!file) {
			uploadError = 'Por favor seleccione un archivo.';
			return;
		}

		uploadError = null;
		uploadSuccess = null;
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
				const summary = result.data.summary;
				uploadSuccess = `¡Importación completada! ${summary.validRows} registros importados exitosamente.`;
				file = null;
				document.getElementById('file-input').value = '';
			} else {
				if (result.error?.code === 'TABLE_NOT_EMPTY') {
					const details = result.error?.details;
					showTableNotEmptyModal(details?.existingRecordCount || 0);
				} else if (result.error?.code === 'VALIDATION_FAILED') {
					const errorCount = result.error?.details?.summary?.invalidRows || 0;
					uploadError = `Se encontraron ${errorCount} errores de validación. Por favor revise la estructura y datos de su archivo Excel, luego intente nuevamente.`;
				} else {
					uploadError = result.error?.message || 'Error al procesar el archivo. Por favor intente nuevamente.';
				}
			}
		} catch (error) {
			console.error('Error al cargar archivo:', error);
			uploadError = 'Ha ocurrido un error al cargar el archivo. Por favor intente nuevamente.';
		} finally {
			isLoading = false;
		}
	};

	function showTableNotEmptyModal(recordCount) {
		existingRecordCount = recordCount;
		showTableNotEmpty = true;
	}

	function closeTableNotEmptyModal() {
		showTableNotEmpty = false;
		existingRecordCount = 0;
	}

	function dismissError() {
		uploadError = null;
	}

	function dismissSuccess() {
		uploadSuccess = null;
	}

	onDestroy(() => {
		file = null;
	});
</script>

<div class="flex min-h-screen flex-col items-center bg-gray-100 px-4 py-6">
	<h1 class="mb-6 text-center text-2xl font-bold">Carga Datos Desde Archivo Excel</h1>

	<BacktoMenu />

	<div class="mb-6 w-full max-w-2xl rounded-lg bg-white p-6 shadow-md">
		<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
			<div class="flex items-start">
				<svg class="mr-3 mt-0.5 h-6 w-6 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
				</svg>
				<div>
					<h3 class="mb-2 text-lg font-semibold text-red-800">¡Atención!</h3>
					<p class="leading-relaxed text-red-700">
						Esta operación empezará un <strong>NUEVO ejercicio de toma de inventario</strong>. Si
						tiene información de un ejercicio anterior, favor
						<strong>Exporte la información</strong>
						antes de proceder con esta carga de datos.
					</p>
				</div>
			</div>
		</div>

		{#if uploadError}
			<div class="mb-6 rounded-lg border border-red-400 bg-red-50 p-4">
				<div class="flex items-start">
					<svg class="mr-3 mt-0.5 h-6 w-6 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
					</svg>
					<div class="flex-1">
						<h3 class="mb-2 font-semibold text-red-800">Error de Importación</h3>
						<p class="text-red-700">{uploadError}</p>
						<button on:click={dismissError} class="mt-2 text-sm text-red-600 underline hover:text-red-800">
							Cerrar
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#if uploadSuccess}
			<div class="mb-6 rounded-lg border border-green-400 bg-green-50 p-4">
				<div class="flex items-start">
					<svg class="mr-3 mt-0.5 h-6 w-6 flex-shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
					</svg>
					<div class="flex-1">
						<h3 class="mb-2 font-semibold text-green-800">Importación Exitosa</h3>
						<p class="text-green-700">{uploadSuccess}</p>
						<button on:click={dismissSuccess} class="mt-2 text-sm text-green-600 underline hover:text-green-800">
							Cerrar
						</button>
					</div>
				</div>
			</div>
		{/if}

		<div class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
			<h3 class="mb-3 text-lg font-semibold text-blue-800">
				Columnas del Archivo Excel
			</h3>
			<div class="text-sm text-blue-700">
	
				<ul class="list-inside list-disc space-y-1">
					<li>id, codigo_barras, gtin, bodega, ubicacion, marca, numero_parte, descripcion, inventario_sistema, single_item_ean13, master_carton_ean13</li>
				</ul>
			</div>
		</div>

		<label for="file-input" class="mb-2 block text-sm font-medium text-gray-700">
			Seleccionar archivo (.xlsx)
		</label>

		<input
			id="file-input"
			type="file"
			accept=".xlsx"
			on:change={(e) => (file = e.target.files[0])}
			disabled={isLoading}
			class="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
		/>

		{#if file && file.name}
			<div class="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
				<p><strong>Archivo:</strong> {file.name}</p>
				<p><strong>Tamaño:</strong> {(file.size / 1024).toFixed(1)} KB</p>
			</div>
		{/if}

		<button
			on:click={uploadFile}
			disabled={isLoading || !file}
			class="flex w-full items-center justify-center rounded-lg bg-blue-500 px-4 py-3 font-medium text-white transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{#if isLoading}
				<svg class="-ml-1 mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				Procesando...
			{:else}
				<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
				</svg>
				Importar Datos
			{/if}
		</button>

		<p class="mt-2 text-center text-xs text-gray-500">
			El proceso validará los datos antes de realizar cualquier cambio
		</p>
	</div>

	{#if showTableNotEmpty}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
			<div class="w-full max-w-md rounded-lg bg-white shadow-xl">
				<div class="border-b border-gray-200 bg-yellow-50 px-6 py-4">
					<div class="flex items-center">
						<svg class="mr-3 h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
						</svg>
						<h3 class="text-lg font-semibold text-yellow-800">Tabla No Está Vacía</h3>
					</div>
				</div>

				<div class="px-6 py-4">
					<div class="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
						<p class="mb-2 font-medium text-yellow-800">
							Se encontraron <span class="font-bold">{existingRecordCount}</span> registros existentes.
						</p>
						<p class="text-sm text-yellow-700">
							Para importar nuevos datos, vaya a <strong>Administración → Limpieza de Tablas</strong>
							para limpiar los datos existentes primero.
						</p>
					</div>
				</div>

				<div class="flex justify-center border-t border-gray-200 px-6 py-4">
					<button
						on:click={closeTableNotEmptyModal}
						class="rounded-lg bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600"
					>
						Entendido
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>