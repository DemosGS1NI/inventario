<!-- src/routes/carga-datos-excel/+page.svelte -->
<script>
	import { onDestroy } from 'svelte';
	import BacktoMenu from '$lib/BackToMenu.svelte';
	import { addToast } from '$lib/stores/toast';

	let file = null;
	let isLoading = false;
	let validationResults = null;
	let showValidationErrors = false;
	let showTableNotEmpty = false;
	let existingRecordCount = 0;

	const uploadFile = async () => {
		if (!file) {
			addToast('Por favor seleccione un archivo.', 'error');
			return;
		}

		isLoading = true;
		validationResults = null;
		showValidationErrors = false;

		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch('/api/carga-datos-excel', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();
			console.log('Server response:', result); // Debug log

			if (response.ok) {
				// Complete success
				const summary = result.data.summary;
				addToast(
					`¡Importación completada! ${summary.validRows} registros importados exitosamente.`,
					'success'
				);

				// Show warnings if any
				if (summary.warnings && summary.warnings.length > 0) {
					addToast(`Se procesaron ${summary.warnings.length} advertencias menores.`, 'warning');
				}

				// Clear the file input after success
				file = null;
				document.getElementById('file-input').value = '';
			} else {
				// Validation failed or other error
				console.log('Error response:', result); // Debug log

				if (result.error?.code === 'TABLE_NOT_EMPTY') {
					// Table contains existing data - need to clean first
					const details = result.error?.details;
					showTableNotEmptyModal(details?.existingRecordCount || 0);
				} else if (result.error?.code === 'VALIDATION_FAILED') {
					// The validation data is in error.details based on errorResponse structure
					const validationData = result.error?.details;

					console.log('Validation data:', validationData); // Debug log

					if (validationData && validationData.invalidRecords) {
						validationResults = validationData;
						showValidationErrors = true;
						addToast(
							`Validación falló: ${validationData.invalidRecords.length} errores encontrados. El archivo NO fue importado.`,
							'error'
						);
					} else {
						console.error('Validation data not found:', result);
						addToast('Error de validación, pero no se pudieron cargar los detalles.', 'error');
					}
				} else {
					handleImportError(result);
				}
			}
		} catch (error) {
			console.error('Error al cargar archivo:', error);
			addToast('Ha ocurrido un error al cargar el archivo. Por favor intente nuevamente.', 'error');
		} finally {
			isLoading = false;
		}
	};

	function handleImportError(result) {
		let errorMessage = 'Error al procesar el archivo';

		if (result.error) {
			if (typeof result.error === 'string') {
				errorMessage = result.error;
			} else if (typeof result.error === 'object' && result.error.message) {
				errorMessage = result.error.message;
			}
		} else if (result.message) {
			errorMessage = result.message;
		}

		addToast(errorMessage, 'error');
	}

	function closeValidationResults() {
		showValidationErrors = false;
		validationResults = null;
	}

	function exportValidationErrors() {
		if (!validationResults?.invalidRecords || !Array.isArray(validationResults.invalidRecords)) {
			addToast('No hay errores de validación para exportar', 'warning');
			return;
		}

		// Create CSV content
		let csvContent = 'Fila,Error\n';
		validationResults.invalidRecords.forEach((record) => {
			if (record.errors && Array.isArray(record.errors)) {
				record.errors.forEach((error) => {
					csvContent += `"${record.rowNumber}","${error.replace(/"/g, '""')}"\n`;
				});
			} else {
				csvContent += `"${record.rowNumber}","Error no especificado"\n`;
			}
		});

		// Download CSV
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute(
			'download',
			`errores_validacion_${new Date().toISOString().split('T')[0]}.csv`
		);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		addToast('Archivo de errores exportado', 'success');
	}

	function showTableNotEmptyModal(recordCount) {
		existingRecordCount = recordCount;
		showTableNotEmpty = true;
		addToast(
			`La tabla contiene ${recordCount} registros existentes. Debe limpiarla primero.`,
			'warning'
		);
	}

	function closeTableNotEmptyModal() {
		showTableNotEmpty = false;
		existingRecordCount = 0;
	}

	// Clean up file input reference
	onDestroy(() => {
		file = null;
	});
</script>

<div class="flex min-h-screen flex-col items-center bg-gray-100 px-4 py-6">
	<h1 class="mb-6 text-center text-2xl font-bold">Carga Datos Desde Archivo Excel</h1>

	<BacktoMenu />

	<div class="mb-6 w-full max-w-2xl rounded-lg bg-white p-6 shadow-md">
		<!-- Important Notice -->
		<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
			<div class="flex items-start">
				<svg
					class="mr-3 mt-0.5 h-6 w-6 flex-shrink-0 text-red-500"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path
						fill-rule="evenodd"
						d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
						clip-rule="evenodd"
					></path>
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

		<!-- Excel Structure Reference -->
		<div class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
			<h3 class="mb-3 text-lg font-semibold text-blue-800">
				Estructura Requerida del Archivo Excel
			</h3>
			<p class="mb-3 text-sm text-blue-700">
				El archivo debe contener las siguientes columnas (exactamente con estos nombres):
			</p>

			<div class="overflow-x-auto">
				<table class="min-w-full rounded border border-blue-200 text-xs">
					<thead class="bg-blue-100">
						<tr>
							<th class="border-r border-blue-200 px-3 py-2 text-left font-medium text-blue-800"
								>Columna</th
							>
							<th class="px-3 py-2 text-left font-medium text-blue-800">Descripción</th>
						</tr>
					</thead>
					<tbody class="bg-white text-blue-700">
						<tr class="border-t border-blue-200">
							<td class="bg-blue-25 border-r border-blue-200 px-3 py-2 font-mono text-xs">id</td>
							<td class="px-3 py-2">Número entero único positivo</td>
						</tr>
						<tr class="border-t border-blue-200">
							<td class="bg-blue-25 border-r border-blue-200 px-3 py-2 font-mono text-xs"
								>codigo_barras</td
							>
							<td class="px-3 py-2">Código de barras del producto</td>
						</tr>
						<tr class="border-t border-blue-200">
							<td class="bg-blue-25 border-r border-blue-200 px-3 py-2 font-mono text-xs">bodega</td
							>
							<td class="px-3 py-2">Nombre de la bodega</td>
						</tr>
						<tr class="border-t border-blue-200">
							<td class="bg-blue-25 border-r border-blue-200 px-3 py-2 font-mono text-xs">gtin</td>
							<td class="px-3 py-2">GTIN del producto</td>
						</tr>
						<tr class="border-t border-blue-200">
							<td class="bg-blue-25 border-r border-blue-200 px-3 py-2 font-mono text-xs"
								>ubicacion</td
							>
							<td class="px-3 py-2">Ubicación dentro de la bodega</td>
						</tr>
						<tr class="border-t border-blue-200">
							<td class="bg-blue-25 border-r border-blue-200 px-3 py-2 font-mono text-xs">marca</td>
							<td class="px-3 py-2">Marca del producto</td>
						</tr>
						<tr class="border-t border-blue-200">
							<td class="bg-blue-25 border-r border-blue-200 px-3 py-2 font-mono text-xs"
								>numero_parte</td
							>
							<td class="px-3 py-2">Número de parte del producto</td>
						</tr>
						<tr class="border-t border-blue-200">
							<td class="bg-blue-25 border-r border-blue-200 px-3 py-2 font-mono text-xs"
								>descripcion</td
							>
							<td class="px-3 py-2">Descripción del producto</td>
						</tr>
						<tr class="border-t border-blue-200">
							<td class="bg-blue-25 border-r border-blue-200 px-3 py-2 font-mono text-xs"
								>inventario_sistema</td
							>
							<td class="px-3 py-2">Cantidad en sistema (número)</td>
						</tr>
						<tr class="border-t border-blue-200">
							<td class="bg-blue-25 border-r border-blue-200 px-3 py-2 font-mono text-xs"
								>single_item_ean13</td
							>
							<td class="px-3 py-2">EAN13 unidad (máx 20 caracteres)</td>
						</tr>
						<tr class="border-t border-blue-200">
							<td class="bg-blue-25 border-r border-blue-200 px-3 py-2 font-mono text-xs"
								>master_carton_ean13</td
							>
							<td class="px-3 py-2">EAN13 caja master (máx 20 caracteres)</td>
						</tr>
					</tbody>
				</table>
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

		<!-- File info -->
		{#if file}
			<div class="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
				<p><strong>Archivo:</strong> {file.name}</p>
				<p><strong>Tamaño:</strong> {(file.size / 1024).toFixed(1)} KB</p>
				<p>
					<strong>Última modificación:</strong>
					{new Date(file.lastModified).toLocaleDateString()}
				</p>
			</div>
		{/if}

		<button
			on:click={uploadFile}
			disabled={isLoading || !file}
			class="flex w-full items-center justify-center rounded-lg bg-blue-500 px-4 py-3 font-medium text-white transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{#if isLoading}
				<svg
					class="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Validando y Procesando...
			{:else}
				<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
					></path>
				</svg>
				Importar Datos
			{/if}
		</button>

		<p class="mt-2 text-center text-xs text-gray-500">
			El proceso validará primero todos los datos antes de realizar cualquier cambio
		</p>
	</div>

	<!-- Validation Errors Modal -->
	{#if showValidationErrors && validationResults}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
			<div class="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
				<!-- Header -->
				<div class="flex items-center justify-between border-b border-gray-200 bg-red-50 px-6 py-4">
					<div>
						<h3 class="text-lg font-semibold text-red-800">Errores de Validación</h3>
						<p class="text-sm text-red-600">
							El archivo NO fue importado debido a errores de validación
						</p>
					</div>
					<button
						on:click={closeValidationResults}
						class="text-gray-400 transition-colors hover:text-gray-600"
						aria-label="Cerrar ventana de errores de validación"
					>
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							></path>
						</svg>
					</button>
				</div>

				<!-- Content -->
				<div class="max-h-[60vh] overflow-y-auto px-6 py-4">
					<!-- Summary Stats -->
					<div class="mb-6 grid grid-cols-3 gap-4">
						<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
							<div class="text-2xl font-bold text-gray-700">
								{validationResults.summary.totalRows}
							</div>
							<div class="text-sm text-gray-600">Total Filas</div>
						</div>

						<div class="rounded-lg border border-green-200 bg-green-50 p-4">
							<div class="text-2xl font-bold text-green-700">
								{validationResults.summary.validRows}
							</div>
							<div class="text-sm text-green-600">Filas Válidas</div>
						</div>

						<div class="rounded-lg border border-red-200 bg-red-50 p-4">
							<div class="text-2xl font-bold text-red-700">
								{validationResults.summary.invalidRows}
							</div>
							<div class="text-sm text-red-600">Filas con Errores</div>
						</div>
					</div>

					<!-- Warnings -->
					{#if validationResults.summary.warnings?.length > 0}
						<div class="mb-6">
							<h4 class="mb-2 font-semibold text-yellow-700">
								Advertencias (No bloquean la importación)
							</h4>
							<div
								class="max-h-32 overflow-y-auto rounded-lg border border-yellow-200 bg-yellow-50 p-4"
							>
								{#each validationResults.summary.warnings as warning}
									<p class="mb-1 text-sm text-yellow-700">⚠️ {warning}</p>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Validation Errors -->
					<div class="mb-6">
						<h4 class="mb-2 font-semibold text-red-700">Errores que Deben Corregirse</h4>

						<div class="max-h-64 overflow-y-auto rounded-lg border border-red-200 bg-red-50">
							{#if validationResults.invalidRecords && validationResults.invalidRecords.length > 0}
								{#each validationResults.invalidRecords as record}
									<div class="border-b border-red-200 p-3 last:border-b-0">
										<p class="text-sm font-medium text-red-700">Fila {record.rowNumber}:</p>
										{#if record.errors && record.errors.length > 0}
											{#each record.errors as error}
												<p class="ml-4 mt-1 text-xs text-red-600">• {error}</p>
											{/each}
										{:else}
											<p class="ml-4 mt-1 text-xs text-red-600">• Error no especificado</p>
										{/if}

										<!-- Show some data context -->
										{#if record.data && (record.data.id || record.data.codigo_barras)}
											<p class="ml-4 mt-1 text-xs text-gray-500">
												Contexto:
												{#if record.data.id}ID: {record.data.id}{/if}
												{#if record.data.codigo_barras}{record.data.id ? ', ' : ''}Código: {record
														.data.codigo_barras}{/if}
											</p>
										{/if}
									</div>
								{/each}
							{:else}
								<div class="p-4 text-center text-red-600">
									<p>
										Se detectaron errores de validación, pero no se pudieron cargar los detalles.
									</p>
									<p class="mt-2 text-xs">Revise la consola del navegador para más información.</p>
								</div>
							{/if}
						</div>
					</div>

					<!-- Instructions -->
					<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
						<h4 class="mb-2 font-semibold text-blue-700">Instrucciones para Corregir</h4>
						<ul class="space-y-1 text-sm text-blue-700">
							<li>• Corrija los errores listados arriba en su archivo Excel</li>
							<li>
								• Todos los errores deben corregirse antes de que el archivo pueda ser importado
							</li>
							<li>• Una vez corregido, vuelva a intentar la importación</li>
						</ul>
					</div>
				</div>

				<!-- Footer -->
				<div class="flex justify-end border-t border-gray-200 px-6 py-4">
					<button
						on:click={closeValidationResults}
						class="rounded-lg bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600"
					>
						Entendido
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Table Not Empty Modal -->
	{#if showTableNotEmpty}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
			<div class="w-full max-w-md rounded-lg bg-white shadow-xl">
				<!-- Header -->
				<div class="border-b border-gray-200 bg-yellow-50 px-6 py-4">
					<div class="flex items-center">
						<svg
							class="mr-3 h-6 w-6 text-yellow-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
							></path>
						</svg>
						<h3 class="text-lg font-semibold text-yellow-800">Tabla de Inventario No Está Vacía</h3>
					</div>
				</div>

				<!-- Content -->
				<div class="px-6 py-4">
					<div class="mb-4">
						<div class="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
							<p class="mb-2 font-medium text-yellow-800">
								Se encontraron <span class="font-bold">{existingRecordCount}</span> registros existentes
								en la tabla de inventario.
							</p>
							<p class="text-sm text-yellow-700">
								Para importar nuevos datos, primero debe limpiar la tabla de inventario existente
								usando la opción "Limpieza de Tablas" en el menú de Administración.
							</p>
						</div>
					</div>
				</div>

				<!-- Footer -->
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
