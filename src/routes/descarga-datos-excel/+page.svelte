<script>
	import BackToMenuButton from '$lib/BackToMenu.svelte';
	import { addToast } from '$lib/stores/toast';

	let isDownloading = false;

	async function downloadExcel() {
		if (isDownloading) return; // Prevent multiple clicks

		isDownloading = true;

		try {
			const response = await fetch('/api/download-excel');

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Error downloading the Excel file.');
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);

			// Get current date and time for filename
			const now = new Date();
			const dateStr = now.toISOString().split('T')[0];
			const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
			const defaultFilename = `inventario_completo_${dateStr}_${timeStr}.xlsx`;

			const filename =
				response.headers.get('Content-Disposition')?.split('filename=')[1] || defaultFilename;

			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();

			// Cleanup
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);

			addToast('Archivo descargado exitosamente', 'success');
		} catch (error) {
			console.error('Error downloading Excel:', error);
			addToast('Error al descargar el archivo. Por favor intente nuevamente.', 'error');
		} finally {
			isDownloading = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col items-center bg-gray-100 py-8">
	<div class="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
		<h1 class="mb-6 text-center text-2xl font-bold text-gray-800">Descargar Datos Completos</h1>

		<div class="mb-6">
			<BackToMenuButton />
		</div>

		<div class="mb-8 space-y-4">
			<div class="rounded-lg border border-blue-100 bg-blue-50 p-4">
				<h2 class="mb-2 font-semibold text-blue-800">Información del Archivo</h2>
				<ul class="space-y-2 text-blue-700">
					<li>• El archivo contendrá 3 hojas de Excel:</li>
					<li class="ml-4">- <strong>Inventario:</strong> Todos los registros de inventario</li>
					<li class="ml-4">- <strong>Movimientos:</strong> Todos los movimientos registrados</li>
					<li class="ml-4">- <strong>Resumen:</strong> Estadísticas generales</li>
					<li>• Formato Excel (.xlsx) con datos actualizados</li>
					<li>• El nombre incluirá fecha y hora de descarga</li>
				</ul>
			</div>

			<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
				<p class="mb-2 text-sm text-gray-600">Formato del nombre del archivo:</p>
				<code class="block rounded border border-gray-300 bg-white p-2 text-sm text-gray-700">
					inventario_completo_YYYY-MM-DD_HH-MM-SS.xlsx
				</code>
			</div>

			<div class="rounded-lg border border-green-200 bg-green-50 p-4">
				<h3 class="mb-2 font-semibold text-green-800">Contenido de las Hojas</h3>
				<div class="space-y-1 text-sm text-green-700">
					<p><strong>Hoja "Inventario":</strong> Productos, cantidades, ubicaciones, incidencias</p>
					<p><strong>Hoja "Movimientos":</strong> Entradas, salidas, documentos, fechas</p>
					<p><strong>Hoja "Resumen":</strong> Totales y fecha de generación</p>
				</div>
			</div>
		</div>

		<button
			on:click={downloadExcel}
			disabled={isDownloading}
			class="flex w-full items-center justify-center space-x-2 rounded-lg bg-blue-500 px-6 py-3 text-white shadow-md transition-colors duration-200 hover:bg-blue-600 disabled:bg-blue-300"
		>
			{#if isDownloading}
				<svg
					class="h-5 w-5 animate-spin text-white"
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
				<span>Generando Archivo...</span>
			{:else}
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
					/>
				</svg>
				<span>Descargar Archivo Completo</span>
			{/if}
		</button>
	</div>
</div>
