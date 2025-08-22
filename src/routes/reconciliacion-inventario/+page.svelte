<script>
	import { onMount } from 'svelte';
	import { addToast } from '$lib/stores/toast';
	import { formatDateTime } from '$lib/utils/dateFormat';
	import BackToMenuButton from '$lib/BackToMenu.svelte';

	// Data variables
	let reconciliationData = [];
	let bodegas = [];
	let marcas = [];
	let ubicaciones = [];
	let loading = false;

	// Filter variables
	let selectedBodega = '';
	let selectedUbicacion = '';
	let selectedMarca = '';
	let filterStatus = ''; // all, explained, discrepancies, no-difference

	// Display options
	let showMovementDetails = false;
	let itemsPerPage = 20;
	let currentPage = 1;

	// Status filter options
	const statusOptions = [
		{ value: '', label: 'Todos los Estados' },
		{ value: 'Sin Diferencia', label: 'Sin Diferencia' },
		{ value: 'Explicado por Movimientos', label: 'Explicado por Movimientos' },
		{ value: 'Discrepancia Real', label: 'Discrepancias Reales' }
	];

	onMount(async () => {
		await fetchBodegas();
	});

	async function fetchBodegas() {
		try {
			const res = await fetch('/api/inventario/fetch-bodegas');
			const data = await res.json();
			if (res.ok && data.status === 'success') {
				bodegas = data.data;
			} else {
				addToast('Error al cargar bodegas: ' + (data.message || 'Error desconocido'), 'error');
			}
		} catch (error) {
			addToast('Error al cargar bodegas: ' + error.message, 'error');
		}
	}

	async function fetchUbicaciones() {
		if (!selectedBodega) {
			ubicaciones = [];
			return;
		}

		try {
			const res = await fetch(
				`/api/inventario/fetch-ubicaciones?bodega=${encodeURIComponent(selectedBodega)}`
			);
			const data = await res.json();
			if (res.ok && data.status === 'success') {
				ubicaciones = data.data;
			} else {
				addToast('Error al cargar ubicaciones: ' + (data.message || 'Error desconocido'), 'error');
			}
		} catch (error) {
			addToast('Error al cargar ubicaciones: ' + error.message, 'error');
		}
	}

	async function fetchMarcas() {
		if (!selectedBodega || !selectedUbicacion) {
			marcas = [];
			return;
		}

		try {
			const res = await fetch(
				`/api/inventario/fetch-marcas?bodega=${encodeURIComponent(selectedBodega)}&ubicacion=${encodeURIComponent(selectedUbicacion)}`
			);
			const data = await res.json();
			if (res.ok && data.status === 'success') {
				marcas = data.data;
			} else {
				addToast('Error al cargar marcas: ' + (data.message || 'Error desconocido'), 'error');
			}
		} catch (error) {
			addToast('Error al cargar marcas: ' + error.message, 'error');
		}
	}

	async function fetchReconciliationData() {
		loading = true;
		try {
			// Build query string with filters
			let queryParams = new URLSearchParams();
			if (selectedBodega) queryParams.append('bodega', selectedBodega);
			if (selectedUbicacion) queryParams.append('ubicacion', selectedUbicacion);
			if (selectedMarca) queryParams.append('marca', selectedMarca);

			const queryString = queryParams.toString();
			const url = `/api/reconciliacion${queryString ? '?' + queryString : ''}`;

			const res = await fetch(url);
			const data = await res.json();

			if (res.ok && data.status === 'success') {
				reconciliationData = data.data.records;
				currentPage = 1; // Reset to first page
				addToast(
					`Análisis completado: ${reconciliationData.length} registros procesados`,
					'success'
				);
			} else {
				addToast(
					'Error al cargar análisis: ' + (data.error?.message || 'Error desconocido'),
					'error'
				);
			}
		} catch (error) {
			addToast('Error al cargar análisis: ' + error.message, 'error');
		} finally {
			loading = false;
		}
	}

	async function handleBodegaChange(event) {
		selectedBodega = event.target.value;
		selectedUbicacion = '';
		selectedMarca = '';
		ubicaciones = [];
		marcas = [];
		reconciliationData = [];

		if (selectedBodega) {
			await fetchUbicaciones();
		}
	}

	async function handleUbicacionChange(event) {
		selectedUbicacion = event.target.value;
		selectedMarca = '';
		marcas = [];
		reconciliationData = [];

		if (selectedUbicacion) {
			await fetchMarcas();
		}
	}

	async function handleMarcaChange(event) {
		selectedMarca = event.target.value;
		reconciliationData = [];
	}

	function clearFilters() {
		selectedBodega = '';
		selectedUbicacion = '';
		selectedMarca = '';
		filterStatus = '';
		ubicaciones = [];
		marcas = [];
		reconciliationData = [];
		currentPage = 1;
	}

	// Computed filtered data
	$: filteredData = filterStatus
		? reconciliationData.filter((record) => record.estadoReconciliacion === filterStatus)
		: reconciliationData;

	// Pagination
	$: totalPages = Math.ceil(filteredData.length / itemsPerPage);
	$: paginatedData = filteredData.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	);

	function getStatusClass(status) {
		switch (status) {
			case 'Sin Diferencia':
				return 'bg-green-100 text-green-800';
			case 'Explicado por Movimientos':
				return 'bg-blue-100 text-blue-800';
			case 'Discrepancia Real':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function getDifferenceClass(value) {
		if (Math.abs(value) < 0.01) return 'text-gray-600';
		return value > 0 ? 'text-green-600' : 'text-red-600';
	}

	async function exportReconciliation() {
		try {
			addToast('Exportando análisis de reconciliación...', 'info');

			// Use the same filters for export
			let queryParams = new URLSearchParams();
			if (selectedBodega) queryParams.append('bodega', selectedBodega);
			if (selectedUbicacion) queryParams.append('ubicacion', selectedUbicacion);
			if (selectedMarca) queryParams.append('marca', selectedMarca);
			queryParams.append('export', 'true');

			const queryString = queryParams.toString();
			const url = `/api/reconciliacion${queryString ? '?' + queryString : '?export=true'}`;

			const response = await fetch(url);

			if (response.ok) {
				const blob = await response.blob();
				const downloadUrl = window.URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = downloadUrl;

				// Get filename from response header or use default
				const contentDisposition = response.headers.get('Content-Disposition');
				const filename = contentDisposition
					? contentDisposition.split('filename=')[1].replace(/"/g, '')
					: `reconciliacion_inventario_${new Date().toISOString().split('T')[0]}.xlsx`;

				link.download = filename;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				window.URL.revokeObjectURL(downloadUrl);

				addToast('Reconciliación exportada exitosamente', 'success');
			} else {
				const errorData = await response.json();
				addToast(
					'Error al exportar reconciliación: ' + (errorData.error?.message || 'Error desconocido'),
					'error'
				);
			}
		} catch (error) {
			addToast('Error al exportar: ' + error.message, 'error');
		}
	}

	function changePage(page) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
		}
	}
</script>

<div class="min-h-screen bg-gray-100 p-6">
	<h1 class="mb-4 text-2xl font-bold">Reporte de Reconciliación de Inventario</h1>

	<div class="mb-6">
		<BackToMenuButton />
	</div>

	<!-- Filters Section -->
	<div class="mb-6 rounded bg-white p-4 shadow">
		<h3 class="mb-4 text-lg font-semibold">Filtros de Análisis</h3>

		<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-5">
			<!-- Bodega Filter -->
			<div>
				<label for="filterBodega" class="block text-sm font-medium text-gray-700">Bodega</label>
				<select
					id="filterBodega"
					value={selectedBodega}
					on:change={handleBodegaChange}
					class="w-full rounded border p-2 focus:border-blue-500 focus:ring-blue-500"
				>
					<option value="">Todas las Bodegas</option>
					{#each bodegas as bodega}
						<option value={bodega}>{bodega}</option>
					{/each}
				</select>
			</div>

			<!-- Ubicacion Filter -->
			<div>
				<label for="filterUbicacion" class="block text-sm font-medium text-gray-700"
					>Ubicación</label
				>
				<select
					id="filterUbicacion"
					value={selectedUbicacion}
					on:change={handleUbicacionChange}
					disabled={!selectedBodega}
					class="w-full rounded border p-2 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
				>
					<option value="">Todas las Ubicaciones</option>
					{#each ubicaciones as ubicacion}
						<option value={ubicacion}>{ubicacion}</option>
					{/each}
				</select>
			</div>

			<!-- Marca Filter -->
			<div>
				<label for="filterMarca" class="block text-sm font-medium text-gray-700">Marca</label>
				<select
					id="filterMarca"
					value={selectedMarca}
					on:change={handleMarcaChange}
					disabled={!selectedUbicacion}
					class="w-full rounded border p-2 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
				>
					<option value="">Todas las Marcas</option>
					{#each marcas as marca}
						<option value={marca}>{marca}</option>
					{/each}
				</select>
			</div>

			<!-- Status Filter -->
			<div>
				<label for="filterStatus" class="block text-sm font-medium text-gray-700">Estado</label>
				<select
					id="filterStatus"
					bind:value={filterStatus}
					class="w-full rounded border p-2 focus:border-blue-500 focus:ring-blue-500"
				>
					{#each statusOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<!-- Actions -->
			<div class="flex items-end gap-2">
				<button
					on:click={fetchReconciliationData}
					disabled={loading}
					class="whitespace-nowrap rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:bg-gray-400"
				>
					{loading ? 'Analizando...' : 'Analizar'}
				</button>
			</div>
		</div>

		<div class="flex gap-2">
			<button
				on:click={clearFilters}
				class="rounded bg-gray-500 px-4 py-2 text-white transition-colors hover:bg-gray-600"
			>
				Limpiar Filtros
			</button>
			<button
				on:click={exportReconciliation}
				disabled={reconciliationData.length === 0}
				class="rounded bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600 disabled:bg-gray-400"
			>
				Exportar
			</button>
			<button
				on:click={() => (showMovementDetails = !showMovementDetails)}
				disabled={reconciliationData.length === 0}
				class="rounded bg-purple-500 px-4 py-2 text-white transition-colors hover:bg-purple-600 disabled:bg-gray-400"
			>
				{showMovementDetails ? 'Ocultar' : 'Mostrar'} Detalles
			</button>
		</div>
	</div>

	<!-- Loading indicator -->
	{#if loading}
		<div class="py-8 text-center">
			<div class="inline-flex items-center">
				<svg
					class="-ml-1 mr-3 h-5 w-5 animate-spin text-blue-500"
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
				Procesando análisis de reconciliación...
			</div>
		</div>
	{/if}

	<!-- Reconciliation Table -->
	{#if paginatedData.length > 0}
		<div class="overflow-hidden rounded bg-white shadow">
			<div class="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
				<h3 class="text-lg font-semibold">
					Resultados de Reconciliación ({filteredData.length} registros)
				</h3>

				<!-- Pagination Info -->
				<div class="text-sm text-gray-600">
					Página {currentPage} de {totalPages}
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Producto
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Inventario Sistema
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Inventario Físico
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Stock Esperado
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Dif. Aparente
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Dif. Real
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Estado
							</th>
							{#if showMovementDetails}
								<th
									class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
								>
									Movimientos Pre-Conteo
								</th>
							{/if}
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each paginatedData as record}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 text-sm text-gray-900">
									<div>
										<div class="font-medium">{record.numero_parte}</div>
										<div class="text-xs text-gray-500">{record.codigo_barras}</div>
										<div class="text-xs text-gray-500">{record.descripcion}</div>
									</div>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
									{record.inventario_sistema}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
									{record.inventario_fisico}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
									{record.stockEsperado ?? '-'}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-sm font-medium {getDifferenceClass(
										record.diferenciaAparente
									)}"
								>
									{record.diferenciaAparente > 0 ? '+' : ''}{record.diferenciaAparente}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-sm font-medium {getDifferenceClass(
										record.diferenciaReal || 0
									)}"
								>
									{record.diferenciaReal !== undefined && record.diferenciaReal !== null
										? (record.diferenciaReal > 0 ? '+' : '') + record.diferenciaReal
										: '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4">
									<span
										class="inline-flex rounded-full px-2 text-xs font-semibold leading-5 {getStatusClass(
											record.estadoReconciliacion
										)}"
									>
										{record.estadoReconciliacion}
									</span>
								</td>
								{#if showMovementDetails}
									<td class="px-6 py-4 text-xs text-gray-600">
										{#if record.tieneMovimientos}
											<div class="space-y-1">
												{#if record.entradasPreConteo > 0}
													<div class="text-green-600">Entradas: +{record.entradasPreConteo}</div>
												{/if}
												{#if record.salidasPreConteo > 0}
													<div class="text-red-600">Salidas: -{record.salidasPreConteo}</div>
												{/if}
												<div class="font-medium">
													Neto: {record.netMovimientosPreConteo > 0
														? '+'
														: ''}{record.netMovimientosPreConteo}
												</div>
											</div>
										{:else}
											<span class="text-gray-400">Sin movimientos</span>
										{/if}
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination Controls -->
			{#if totalPages > 1}
				<div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
					<div class="flex flex-1 justify-between sm:hidden">
						<button
							on:click={() => changePage(currentPage - 1)}
							disabled={currentPage === 1}
							class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
						>
							Anterior
						</button>
						<button
							on:click={() => changePage(currentPage + 1)}
							disabled={currentPage === totalPages}
							class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
						>
							Siguiente
						</button>
					</div>
					<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
						<div>
							<p class="text-sm text-gray-700">
								Mostrando
								<span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
								a
								<span class="font-medium"
									>{Math.min(currentPage * itemsPerPage, filteredData.length)}</span
								>
								de
								<span class="font-medium">{filteredData.length}</span>
								resultados
							</p>
						</div>
						<div>
							<nav class="relative z-0 inline-flex -space-x-px rounded-md shadow-sm">
								<button
									on:click={() => changePage(currentPage - 1)}
									disabled={currentPage === 1}
									class="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
								>
									Anterior
								</button>

								<!-- Page numbers -->
								{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + Math.max(1, currentPage - 2)) as page}
									{#if page <= totalPages}
										<button
											on:click={() => changePage(page)}
											class="relative inline-flex items-center border px-4 py-2 text-sm font-medium
                             {page === currentPage
												? 'z-10 border-blue-500 bg-blue-50 text-blue-600'
												: 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}"
										>
											{page}
										</button>
									{/if}
								{/each}

								<button
									on:click={() => changePage(currentPage + 1)}
									disabled={currentPage === totalPages}
									class="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
								>
									Siguiente
								</button>
							</nav>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{:else if !loading && reconciliationData.length === 0}
		<div class="rounded bg-white p-12 text-center shadow">
			<svg
				class="mx-auto h-12 w-12 text-gray-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-6a2 2 0 01-2-2z"
				/>
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">Sin datos de reconciliación</h3>
			<p class="mt-1 text-sm text-gray-500">
				Seleccione filtros y haga clic en "Analizar" para generar el reporte de reconciliación.
			</p>
		</div>
	{/if}
</div>
