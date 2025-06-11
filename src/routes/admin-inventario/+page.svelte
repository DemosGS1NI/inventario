<script>
	import { onMount, onDestroy } from 'svelte';
	import BackToMenu from '$lib/BackToMenu.svelte';
	import { adminInventoryStore } from '$lib/stores/adminInventory';
	import { formatDateTime } from '$lib/utils/dateFormat';
	import {
		Maximize2,
		Minimize2,
		RefreshCw,
		ChevronDown,
		AlertTriangle,
		CheckCircle,
		XCircle,
		TrendingUp,
		Users,
		MapPin
	} from 'lucide-svelte';

	console.log('Admin Inventory Component: Initializing');

	// Use Svelte's store subscription with destructuring
	$: ({
		bodegas,
		marcas,
		ubicaciones,
		records,
		selectedBodega,
		selectedMarca,
		selectedUbicacion,
		loading,
		error,
		lastUpdated,
		isFullscreen,
		progressData
	} = $adminInventoryStore);

	// Touch feedback handlers
	function handleTouchStart(event) {
		event.target.classList.add('active');
	}

	function handleTouchEnd(event) {
		event.target.classList.remove('active');
	}

	// Handle selection changes
	function handleBodegaChange(event) {
		console.log('Bodega changed:', event.target.value);
		const newBodega = event.target.value;

		adminInventoryStore.setSelections(newBodega, '', '');

		if (newBodega) {
			fetchBodegas().then(() => {
				fetchUbicaciones();
			});
		}
		// Fetch progress data when bodega changes
		fetchProgressData();
	}

	function handleUbicacionChange(event) {
		const newUbicacion = event.target.value;
		adminInventoryStore.setSelections(selectedBodega, '', newUbicacion);

		if (newUbicacion) {
			fetchUbicaciones().then(() => {
				fetchMarcas();
			});
		}
		fetchProgressData();
	}

	function handleMarcaChange(event) {
		const newMarca = event.target.value;
		adminInventoryStore.setSelections(selectedBodega, newMarca, selectedUbicacion);

		if (newMarca) {
			fetchMarcas().then(() => {
				fetchRecords();
			});
		}
		fetchProgressData();
	}

	// Fetch functions
	async function fetchBodegas() {
		adminInventoryStore.setLoading(true);
		try {
			const res = await fetch('/api/inventario/fetch-bodegas');
			const data = await res.json();

			if (res.ok && data.status === 'success') {
				adminInventoryStore.setBodegas(data.data);
				if (selectedBodega) {
					await fetchUbicaciones();
					if (selectedUbicacion) {
						await fetchMarcas();
						if (selectedMarca) {
							await fetchRecords();
						}
					}
				}
			} else {
				adminInventoryStore.setError(
					'Error fetching bodegas: ' + (data.message || 'Unknown error')
				);
			}
		} catch (error) {
			adminInventoryStore.setError('Error fetching bodegas: ' + error.message);
		} finally {
			adminInventoryStore.setLoading(false);
		}
	}

	async function fetchMarcas() {
		if (!selectedBodega || !selectedUbicacion) {
			adminInventoryStore.setMarcas([]);
			return;
		}

		adminInventoryStore.setLoading(true);
		adminInventoryStore.setError(null);

		try {
			const url = `/api/inventario/fetch-marcas?bodega=${encodeURIComponent(selectedBodega)}&ubicacion=${encodeURIComponent(selectedUbicacion)}`;
			console.log('Fetching marcas:', url);

			const res = await fetch(url);
			const data = await res.json();

			if (res.ok && data.status === 'success') {
				if (selectedBodega && selectedUbicacion) {
					adminInventoryStore.setMarcas(data.data);
				}
			} else {
				throw new Error(data.message || 'Unknown error');
			}
		} catch (error) {
			console.error('Marcas fetch error:', error);
			adminInventoryStore.setError('Error fetching marcas: ' + error.message);
			adminInventoryStore.setMarcas([]);
		} finally {
			adminInventoryStore.setLoading(false);
		}
	}

	async function fetchUbicaciones() {
		if (!selectedBodega) {
			adminInventoryStore.setUbicaciones([]);
			return;
		}

		adminInventoryStore.setLoading(true);
		adminInventoryStore.setError(null);

		try {
			const url = `/api/inventario/fetch-ubicaciones?bodega=${encodeURIComponent(selectedBodega)}`;
			console.log('Fetching ubicaciones:', url);

			const res = await fetch(url);
			const data = await res.json();

			if (res.ok && data.status === 'success') {
				if (selectedBodega) {
					adminInventoryStore.setUbicaciones(data.data);
				}
			} else {
				throw new Error(data.message || 'Unknown error');
			}
		} catch (error) {
			console.error('Ubicaciones fetch error:', error);
			adminInventoryStore.setError('Error fetching ubicaciones: ' + error.message);
			adminInventoryStore.setUbicaciones([]);
		} finally {
			adminInventoryStore.setLoading(false);
		}
	}

	async function fetchRecords() {
		if (!selectedBodega || !selectedUbicacion || !selectedMarca) {
			console.log('Missing parameters:', { selectedBodega, selectedUbicacion, selectedMarca });
			return;
		}

		adminInventoryStore.setLoading(true);
		try {
			// NEW API PATH: admin-inventario/records
			const url = `/api/admin-inventario/records?bodega=${encodeURIComponent(selectedBodega)}&ubicacion=${encodeURIComponent(selectedUbicacion)}&marca=${encodeURIComponent(selectedMarca)}`;
			console.log('Fetching records with URL:', url);

			const inventoryRes = await fetch(url);
			const data = await inventoryRes.json();
			console.log('Response data:', data);

			if (inventoryRes.ok && data.status === 'success') {
				adminInventoryStore.setRecords(data.data);
			} else if (inventoryRes.status === 404) {
				adminInventoryStore.setRecords([]);
				adminInventoryStore.setError('No se encontraron registros para esta selección');
			} else {
				const errorMessage = data.error?.message || 'Error desconocido';
				adminInventoryStore.setError('Error al cargar registros: ' + errorMessage);
			}
		} catch (error) {
			console.error('Fetch error:', error);
			adminInventoryStore.setError('Error al cargar registros: ' + error.message);
		} finally {
			adminInventoryStore.setLoading(false);
		}
	}

	// NEW: Fetch progress data
	async function fetchProgressData() {
		try {
			// NEW API PATH: admin-inventario/progress
			let url = '/api/admin-inventario/progress';
			const params = new URLSearchParams();
			
			if (selectedBodega) params.append('bodega', selectedBodega);
			if (selectedMarca) params.append('marca', selectedMarca);
			if (selectedUbicacion) params.append('ubicacion', selectedUbicacion);
			
			if (params.toString()) {
				url += '?' + params.toString();
			}

			const res = await fetch(url);
			const data = await res.json();

			if (res.ok && data.status === 'success') {
				adminInventoryStore.setProgressData(data.data);
			}
		} catch (error) {
			console.error('Error fetching progress data:', error);
		}
	}

	async function validateRecord(record) {
		try {
			adminInventoryStore.setLoading(true);
			// NEW API PATH: admin-inventario/validation
			const res = await fetch('/api/admin-inventario/validation', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: record.id,
					validado_por: record.validado_por
				})
			});

			const data = await res.json();

			if (res.ok && data.status === 'success') {
				await fetchRecords();
				await fetchProgressData(); // Refresh progress after validation
			} else {
				adminInventoryStore.setError(
					'Error validating record: ' + (data.message || 'Unknown error')
				);
			}
		} catch (error) {
			adminInventoryStore.setError('Error validating record: ' + error.message);
		} finally {
			adminInventoryStore.setLoading(false);
		}
	}

	function calculateDiferencia(inventario_sistema, inventario_fisico, fecha_inventario) {
		if (fecha_inventario === null) {
			return '';
		} else {
			return inventario_fisico - inventario_sistema;
		}
	}

	function calculateTipoDiferencia(inventario_sistema, inventario_fisico, fecha_inventario) {
		const sistema = Number(inventario_sistema);
		const fisico = Number(inventario_fisico);

		if (fecha_inventario === null) {
			return '';
		}

		if (isNaN(sistema) || isNaN(fisico)) {
			return 'Error: Valores no numéricos';
		}

		const diferencia = sistema - fisico;

		if (diferencia > 0) {
			return 'Faltante';
		} else if (diferencia < 0) {
			return 'Sobrante';
		} else {
			return 'Sin Diferencia';
		}
	}

	// Manual refresh function with debounce
	let refreshTimeout;
	async function refreshData() {
		if (refreshTimeout) clearTimeout(refreshTimeout);

		if (selectedBodega && selectedMarca && selectedUbicacion) {
			refreshTimeout = setTimeout(async () => {
				await fetchRecords();
				await fetchProgressData();
			}, 300);
		}
	}

	onMount(async () => {
		console.log('Admin Inventory Component: onMount');
		adminInventoryStore.setLoading(true);
		try {
			await fetchBodegas();
			await fetchProgressData(); // Fetch initial progress data
			if (selectedBodega) {
				await fetchUbicaciones();
				if (selectedUbicacion) {
					await fetchMarcas();
					if (selectedMarca) {
						await fetchRecords();
					}
				}
			}
		} catch (error) {
			console.error('Initialization error:', error);
			adminInventoryStore.setError('Error initializing data: ' + error.message);
		} finally {
			adminInventoryStore.setLoading(false);
		}
	});

	onDestroy(() => {
		if (refreshTimeout) {
			clearTimeout(refreshTimeout);
		}
	});

	// SIMPLIFIED: Get simple movement summary
	function getMovementSummary(movements) {
		if (!movements || movements.netMovimientos === 0) {
			return { display: '-', class: 'text-gray-600' };
		}

		const net = movements.netMovimientos;
		const sign = net > 0 ? '+' : '';
		const colorClass = net > 0 ? 'text-green-600' : 'text-red-600';
		
		return {
			display: `Net: ${sign}${net}`,
			class: colorClass
		};
	}
</script>

<div
	class="min-h-screen bg-gray-100 p-4 {isFullscreen ? 'fixed inset-0 z-50' : ''} touch-manipulation"
>
	<!-- Header with controls -->
	<div class="sticky top-0 z-10 mb-4 flex items-center justify-between bg-gray-100 p-2">
		<div class="flex items-center gap-2">
			<h1 class="text-xl font-bold md:text-2xl">Administración del Inventario</h1>
		</div>
		<div><BackToMenu /></div>

		<div class="flex items-center gap-2">
			<button
				class="touch-manipulation rounded-full p-3 transition-colors hover:bg-gray-200 active:bg-gray-300"
				on:click={() => adminInventoryStore.toggleFullscreen()}
				on:touchstart={handleTouchStart}
				on:touchend={handleTouchEnd}
				aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
			>
				{#if isFullscreen}
					<Minimize2 size={24} />
				{:else}
					<Maximize2 size={24} />
				{/if}
			</button>

			<button
				class="flex touch-manipulation items-center gap-2 rounded-lg bg-blue-500 px-4 py-3 text-white
               transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-400"
				on:click={refreshData}
				on:touchstart={handleTouchStart}
				on:touchend={handleTouchEnd}
				disabled={loading || !selectedUbicacion}
			>
				<RefreshCw size={20} class={loading ? 'animate-spin' : ''} />
				<span class="hidden md:inline">{loading ? 'Refreshing...' : 'Refresh'}</span>
			</button>
		</div>
	</div>

	<!-- NEW: Progress Tracking Section -->
	{#if progressData && progressData.overallExercise}
		<div class="sticky top-16 z-10 mb-6 grid grid-cols-1 gap-4 bg-gray-100 p-2 md:grid-cols-3">
			<!-- Overall Exercise Progress -->
			<div class="rounded-lg bg-white p-4 shadow">
				<div class="flex items-center gap-2 mb-2">
					<TrendingUp size={20} class="text-blue-500" />
					<h3 class="font-semibold text-gray-800">Progreso General</h3>
				</div>
				<div class="space-y-2">
					<div class="flex justify-between text-sm">
						<span>Contados:</span>
						<span class="font-medium">
							{progressData.overallExercise.countedProducts}/{progressData.overallExercise.totalProducts}
							({progressData.overallExercise.percentageCounted}%)
						</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div 
							class="bg-blue-500 h-2 rounded-full transition-all duration-300" 
							style="width: {progressData.overallExercise.percentageCounted}%"
						></div>
					</div>
					<div class="flex justify-between text-sm">
						<span>Validados:</span>
						<span class="font-medium text-green-600">
							{progressData.overallExercise.validatedProducts} ({progressData.overallExercise.percentageValidated}%)
						</span>
					</div>
				</div>
			</div>

			<!-- Current View Progress -->
			{#if progressData.currentView}
				<div class="rounded-lg bg-white p-4 shadow">
					<div class="flex items-center gap-2 mb-2">
						<MapPin size={20} class="text-green-500" />
						<h3 class="font-semibold text-gray-800">Vista Actual</h3>
					</div>
					<div class="space-y-2">
						<div class="flex justify-between text-sm">
							<span>Contados:</span>
							<span class="font-medium">
								{progressData.currentView.countedProducts}/{progressData.currentView.totalProducts}
								({progressData.currentView.percentageCounted}%)
							</span>
						</div>
						<div class="w-full bg-gray-200 rounded-full h-2">
							<div 
								class="bg-green-500 h-2 rounded-full transition-all duration-300" 
								style="width: {progressData.currentView.percentageCounted}%"
							></div>
						</div>
						<div class="flex justify-between text-sm">
							<span>Validados:</span>
							<span class="font-medium text-green-600">
								{progressData.currentView.validatedProducts} ({progressData.currentView.percentageValidated}%)
							</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Summary Stats -->
			<div class="rounded-lg bg-white p-4 shadow">
				<div class="flex items-center gap-2 mb-2">
					<Users size={20} class="text-purple-500" />
					<h3 class="font-semibold text-gray-800">Resumen</h3>
				</div>
				<div class="space-y-1 text-sm">
					<div class="flex justify-between">
						<span>Bodegas:</span>
						<span class="font-medium">{progressData.summary.totalBodegas}</span>
					</div>
					<div class="flex justify-between">
						<span>Ubicaciones:</span>
						<span class="font-medium">{progressData.summary.totalUbicaciones}</span>
					</div>
					<div class="flex justify-between">
						<span>Pendientes Validación:</span>
						<span class="font-medium text-orange-600">{progressData.summary.pendingValidation}</span>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Filters -->
	<div class="sticky top-16 z-10 mb-6 flex flex-col gap-4 bg-gray-100 p-2 md:flex-row">
		<div class="relative flex-1">
			<select
				value={selectedBodega}
				on:change={handleBodegaChange}
				class="h-12 w-full touch-manipulation appearance-none rounded-lg border border-gray-300 bg-white
               px-4 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
			>
				<option value="">Seleccionar Bodega</option>
				{#each bodegas as bodega}
					<option value={bodega}>{bodega}</option>
				{/each}
			</select>
			<ChevronDown
				size={20}
				class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-500"
			/>
		</div>

		<div class="relative flex-1">
			<select
				value={selectedUbicacion}
				on:change={handleUbicacionChange}
				disabled={!selectedBodega}
				class="h-12 w-full touch-manipulation appearance-none rounded-lg border border-gray-300 bg-white
               px-4 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
               disabled:cursor-not-allowed disabled:bg-gray-100"
			>
				<option value="">Seleccionar Ubicación</option>
				{#each ubicaciones as ubicacion}
					<option value={ubicacion}>{ubicacion}</option>
				{/each}
			</select>
			<ChevronDown
				size={20}
				class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-500"
			/>
		</div>

		<div class="relative flex-1">
			<select
				value={selectedMarca}
				on:change={handleMarcaChange}
				disabled={!selectedUbicacion}
				class="h-12 w-full touch-manipulation appearance-none rounded-lg border border-gray-300 bg-white
               px-4 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
               disabled:cursor-not-allowed disabled:bg-gray-100"
			>
				<option value="">Seleccionar Marca</option>
				{#each marcas as marca}
					<option value={marca}>{marca}</option>
				{/each}
			</select>
			<ChevronDown
				size={20}
				class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-500"
			/>
		</div>
	</div>

	<!-- Status messages -->
	{#if loading}
		<div
			class="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-3 text-blue-700 shadow-lg"
		>
			<RefreshCw size={20} class="animate-spin" />
			Actualizando...
		</div>
	{/if}

	{#if error}
		<div
			class="mb-4 flex items-center gap-2 rounded-lg border border-red-400 bg-red-100 px-4 py-3 text-red-700"
		>
			<AlertTriangle size={20} />
			{error}
		</div>
	{/if}

	<!-- Last updated info -->
	{#if lastUpdated}
		<div class="mb-4 text-sm text-gray-600">
			Última actualización: {lastUpdated}
		</div>
	{/if}

	<!-- Records Table -->
	{#if records.length > 0}
		<div class="overflow-x-auto rounded-lg bg-white shadow">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th
							class="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
						>
							Código
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>Parte</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>Descripción</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>Sistema</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>Físico</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>Dif</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>Tipo</th
						>
						<!-- SIMPLIFIED: Movement column header -->
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
						>
							Movimientos
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>ItemEAN13</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>CajaEAN13</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>Incidencia</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>Inventariante</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>Fecha</th
						>
						<th
							class="sticky right-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
						>
							Acciones
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each records as record}
						<tr class="touch-manipulation hover:bg-gray-50">
							<td class="sticky left-0 whitespace-nowrap bg-white px-6 py-4"
								>{record.codigo_barras}</td
							>
							<td class="whitespace-nowrap px-6 py-4">{record.numero_parte}</td>
							<td class="px-6 py-4">{record.descripcion}</td>
							<td class="whitespace-nowrap px-6 py-4">{record.inventario_sistema}</td>
							<td class="whitespace-nowrap px-6 py-4">{record.inventario_fisico}</td>
							<td class="whitespace-nowrap px-6 py-4">
								{calculateDiferencia(
									record.inventario_sistema,
									record.inventario_fisico,
									record.fecha_inventario
								)}
							</td>
							<td class="whitespace-nowrap px-6 py-4">
								{#if calculateTipoDiferencia(record.inventario_sistema, record.inventario_fisico, record.fecha_inventario) === 'Faltante'}
									<span
										class="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800"
									>
										{calculateTipoDiferencia(record.inventario_sistema, record.inventario_fisico)}
									</span>
								{:else if calculateTipoDiferencia(record.inventario_sistema, record.inventario_fisico, record.fecha_inventario) === 'Sobrante'}
									<span
										class="inline-flex rounded-full bg-yellow-100 px-2 text-xs font-semibold leading-5 text-yellow-800"
									>
										{calculateTipoDiferencia(record.inventario_sistema, record.inventario_fisico)}
									</span>
								{:else}
									<span
										class="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800"
									>
										{calculateTipoDiferencia(
											record.inventario_sistema,
											record.inventario_fisico,
											record.fecha_inventario
										)}
									</span>
								{/if}
							</td>

							<!-- SIMPLIFIED: Movement display - just net total -->
							<td class="px-6 py-4 text-sm">
								{#if record.movements && record.movements.netMovimientos !== 0}
									{@const net = record.movements.netMovimientos}
									{@const sign = net > 0 ? '+' : ''}
									{@const colorClass = net > 0 ? 'text-green-600' : 'text-red-600'}
									<span class="{colorClass} font-medium">
										Net: {sign}{net}
									</span>
								{:else}
									<span class="text-gray-600 font-medium">-</span>
								{/if}
							</td>

							<td class="px-6 py-4">{record.single_item_ean13}</td>
							<td class="px-6 py-4">{record.master_carton_ean13}</td>
							<td class="px-6 py-4">{record.incidencia}</td>
							<td class="whitespace-nowrap px-6 py-4">{record.nombre}</td>
							<td class="whitespace-nowrap px-6 py-4">{formatDateTime(record.fecha_inventario)}</td>
							<td class="sticky right-0 whitespace-nowrap bg-white px-6 py-4">
								<button
									class="flex touch-manipulation items-center gap-2 rounded-lg bg-blue-500 px-4 py-3
                         text-white transition-colors hover:bg-blue-600 active:bg-blue-700
                         disabled:bg-gray-400"
									on:click={() => validateRecord(record)}
									on:touchstart={handleTouchStart}
									on:touchend={handleTouchEnd}
									disabled={record.validado}
								>
									{#if record.validado}
										<CheckCircle size={20} />
										<span class="hidden md:inline">Validado</span>
									{:else}
										<XCircle size={20} />
										<span class="hidden md:inline">Validar</span>
									{/if}
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="py-8 text-center text-gray-500">No se encontraron registros.</div>
	{/if}
</div>

<style>
	/* Add touch-specific styles */
	:global(.touch-manipulation) {
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	:global(.active) {
		transform: scale(0.98);
	}
</style>