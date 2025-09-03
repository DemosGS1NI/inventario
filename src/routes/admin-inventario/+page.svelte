<script>
	// ===== IMPORTS =====
	// External libraries
	import { onMount, onDestroy } from 'svelte';
	import { Maximize2, Minimize2, RefreshCw, AlertTriangle } from 'lucide-svelte';

	// Internal components and utilities
	import BackToMenu from '$lib/BackToMenu.svelte';
	import { adminInventoryStore } from '$lib/stores/adminInventory';
	import AdminProgress from './AdminProgress.svelte';
	import AdminFilters from './AdminFilters.svelte';
	import AdminTable from './AdminTable.svelte';

	// ===== REACTIVE STATE =====
	// Store subscriptions with destructuring
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

	// ===== LOCAL VARIABLES =====
	let refreshTimeout;
	let showProgress = true;

	// Compute Vista Actual stats reactively
	$: vistaActualStats = {
		counted: records.length, // Adjust 'counted' if your field is different
		validated: records.filter((r) => r.validado === true).length // Adjust 'validated' if your field is different
	};

	// Restore showProgress from sessionStorage before mount (browser only)
	if (typeof window !== 'undefined') {
		const savedShowProgress = window.sessionStorage.getItem('adminShowProgress');
		if (savedShowProgress !== null) {
			showProgress = savedShowProgress === 'true';
		}
	}

	// Watch showProgress and persist to sessionStorage (browser only)
	$: if (typeof window !== 'undefined') {
		window.sessionStorage.setItem('adminShowProgress', showProgress);
	}

	onMount(async () => {
		console.log('🔄 [admin-inventario] Component mounted');
		await fetchBodegas();
		await fetchRecords(); // Fetch all records on mount
	});

	// Watch showProgress and persist to sessionStorage
	$: sessionStorage.setItem('adminShowProgress', showProgress);

	// ===== EVENT HANDLERS =====
	// Touch feedback for mobile
	function handleTouchStart(event) {
		event.target.classList.add('active');
	}

	function handleTouchEnd(event) {
		event.target.classList.remove('active');
	}

	// Filter change handlers
	function handleBodegaChange(event) {
		console.log('Bodega changed:', event.detail);
		const newBodega = event.detail;
		adminInventoryStore.setSelections(newBodega, '', '');
		if (newBodega) {
			fetchBodegas().then(() => {
				fetchUbicaciones();
			});
		}
		fetchRecords(newBodega, '', '');
		fetchProgressData(newBodega, '', '');
	}

	function handleUbicacionChange(event) {
		const newUbicacion = event.detail;
		adminInventoryStore.setSelections(selectedBodega, '', newUbicacion);
		if (newUbicacion) {
			fetchUbicaciones().then(() => {
				fetchMarcas();
			});
		}
		fetchRecords(selectedBodega, '', newUbicacion);
		fetchProgressData(selectedBodega, '', newUbicacion);
	}

	function handleMarcaChange(event) {
		const newMarca = event.detail;
		adminInventoryStore.setSelections(selectedBodega, newMarca, selectedUbicacion);
		if (newMarca) {
			fetchMarcas().then(() => {
				fetchRecords(selectedBodega, newMarca, selectedUbicacion);
			});
		} else {
			fetchRecords(selectedBodega, '', selectedUbicacion);
		}
		fetchProgressData(selectedBodega, newMarca, selectedUbicacion);
	}

	// Limpiar Filtros handler
	function clearFilters() {
		adminInventoryStore.setSelections('', '', '');
		fetchRecords('', '', '');
		fetchProgressData('', '', '');
	}

	// ===== DATA FETCHING FUNCTIONS =====
	async function fetchBodegas() {
		console.log('🔍 [admin-inventario] Fetching bodegas');
		adminInventoryStore.setLoading(true);
		try {
			const res = await fetch('/api/inventario/fetch-bodegas');
			const data = await res.json();

			if (res.ok && data.status === 'success') {
				adminInventoryStore.setBodegas(data.data);
				console.log('✅ [admin-inventario] Bodegas loaded:', { count: data.data.length });
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
				console.error('❌ [admin-inventario] Error loading bodegas:', data.message);
				adminInventoryStore.setError(
					'Error fetching bodegas: ' + (data.message || 'Unknown error')
				);
			}
		} catch (error) {
			console.error('❌ [admin-inventario] Error loading bodegas:', error);
			adminInventoryStore.setError('Error fetching bodegas: ' + error.message);
		} finally {
			adminInventoryStore.setLoading(false);
		}
	}

	async function fetchUbicaciones() {
		if (!selectedBodega) {
			console.log('⚠️ [admin-inventario] No bodega selected for ubicaciones');
			adminInventoryStore.setUbicaciones([]);
			return;
		}

		console.log('🔍 [admin-inventario] Fetching ubicaciones for bodega:', selectedBodega);
		adminInventoryStore.setLoading(true);
		adminInventoryStore.setError(null);

		try {
			const url = `/api/inventario/fetch-ubicaciones?bodega=${encodeURIComponent(selectedBodega)}`;
			console.log('🔍 [admin-inventario] Fetching ubicaciones:', url);

			const res = await fetch(url);
			const data = await res.json();

			if (res.ok && data.status === 'success') {
				if (selectedBodega) {
					adminInventoryStore.setUbicaciones(data.data);
					console.log('✅ [admin-inventario] Ubicaciones loaded:', { count: data.data.length });
				}
			} else {
				throw new Error(data.message || 'Unknown error');
			}
		} catch (error) {
			console.error('❌ [admin-inventario] Ubicaciones fetch error:', error);
			adminInventoryStore.setError('Error fetching ubicaciones: ' + error.message);
			adminInventoryStore.setUbicaciones([]);
		} finally {
			adminInventoryStore.setLoading(false);
		}
	}

	async function fetchMarcas() {
		if (!selectedBodega || !selectedUbicacion) {
			console.log('⚠️ [admin-inventario] Missing required fields for marcas:', {
				selectedBodega,
				selectedUbicacion
			});
			adminInventoryStore.setMarcas([]);
			return;
		}

		console.log('🔍 [admin-inventario] Fetching marcas:', { selectedBodega, selectedUbicacion });
		adminInventoryStore.setLoading(true);
		adminInventoryStore.setError(null);

		try {
			const url = `/api/inventario/fetch-marcas?bodega=${encodeURIComponent(selectedBodega)}&ubicacion=${encodeURIComponent(selectedUbicacion)}`;
			console.log('🔍 [admin-inventario] Fetching marcas:', url);

			const res = await fetch(url);
			const data = await res.json();

			if (res.ok && data.status === 'success') {
				if (selectedBodega && selectedUbicacion) {
					adminInventoryStore.setMarcas(data.data);
					console.log('✅ [admin-inventario] Marcas loaded:', { count: data.data.length });
				}
			} else {
				throw new Error(data.message || 'Unknown error');
			}
		} catch (error) {
			console.error('❌ [admin-inventario] Marcas fetch error:', error);
			adminInventoryStore.setError('Error fetching marcas: ' + error.message);
			adminInventoryStore.setMarcas([]);
		} finally {
			adminInventoryStore.setLoading(false);
		}
	}

	async function fetchRecords(
		bodega = selectedBodega,
		marca = selectedMarca,
		ubicacion = selectedUbicacion
	) {
		// No longer require all filters; fetch all records if none selected
		adminInventoryStore.setLoading(true);
		try {
			let url = '/api/admin-inventario/records';
			const params = new URLSearchParams();
			if (bodega) params.append('bodega', bodega);
			if (ubicacion) params.append('ubicacion', ubicacion);
			if (marca) params.append('marca', marca);
			if (params.toString()) {
				url += '?' + params.toString();
			}
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

	async function fetchProgressData(
		bodega = selectedBodega,
		marca = selectedMarca,
		ubicacion = selectedUbicacion
	) {
		try {
			let url = '/api/admin-inventario/progress';
			const params = new URLSearchParams();

			if (bodega) params.append('bodega', bodega);
			if (marca) params.append('marca', marca);
			if (ubicacion) params.append('ubicacion', ubicacion);

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

	// ===== ACTION FUNCTIONS =====
	async function validateRecord(event) {
		const record = event.detail;
		try {
			adminInventoryStore.setLoading(true);
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
				await fetchProgressData();
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

	// Updated refreshData to always refresh with current filters
	async function refreshData() {
		if (refreshTimeout) clearTimeout(refreshTimeout);
		refreshTimeout = setTimeout(async () => {
			await fetchRecords(selectedBodega, selectedMarca, selectedUbicacion);
			await fetchProgressData(selectedBodega, selectedMarca, selectedUbicacion);
		}, 300);
	}

	// ===== REACTIVE RECORD FETCHING =====
	$: fetchRecordsOnFilterChange = (async () => {
		if (typeof window === 'undefined') return; // Only run in browser
		await fetchRecords();
	})();

	// Calculate dynamic max-height for the table
	$: tableMaxHeight = showProgress
		? 'calc(100vh - 220px - 120px)' // header+filters+padding + progress
		: 'calc(100vh - 220px)'; // header+filters+padding only

	// ===== LIFECYCLE =====
	onMount(async () => {
		console.log('🔄 [admin-inventario] Component mounted');
		await fetchBodegas();
		await fetchRecords(); // Fetch all records on mount
	});

	onDestroy(() => {
		if (refreshTimeout) {
			clearTimeout(refreshTimeout);
		}
	});
</script>

<!-- ===== MAIN TEMPLATE ===== -->
<div
	class="min-h-screen bg-gray-100 p-4 {isFullscreen
		? 'fixed inset-0 z-50'
		: ''} flex touch-manipulation flex-col"
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

	<!-- Show/Hide Progress Toggle -->
	<div class="mb-2 flex items-center">
		<button
			class="mr-2 rounded bg-gray-300 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-400"
			on:click={() => (showProgress = !showProgress)}
		>
			{showProgress ? 'Ocultar Progreso' : 'Mostrar Progreso'}
		</button>
	</div>

	<!-- Progress Tracking -->
	{#if showProgress}
		<AdminProgress {progressData} {vistaActualStats} />
	{/if}

	<!-- Filters -->
	<AdminFilters
		{bodegas}
		{marcas}
		{ubicaciones}
		{selectedBodega}
		{selectedMarca}
		{selectedUbicacion}
		{loading}
		on:bodegaChange={handleBodegaChange}
		on:ubicacionChange={handleUbicacionChange}
		on:marcaChange={handleMarcaChange}
		on:clearFilters={clearFilters}
	/>

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
	<div
		class="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded bg-white shadow"
		style="max-height: 50vh;"
	>
		<AdminTable
			{records}
			{selectedBodega}
			{selectedMarca}
			{selectedUbicacion}
			{loading}
			on:validate={validateRecord}
		/>
	</div>
</div>

<!-- ===== STYLES ===== -->
<style>
	/* Touch-specific styles */
	:global(.touch-manipulation) {
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	:global(.active) {
		transform: scale(0.98);
	}
</style>
