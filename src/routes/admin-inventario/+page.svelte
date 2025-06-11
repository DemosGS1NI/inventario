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
		fetchProgressData();
	}

	function handleUbicacionChange(event) {
		const newUbicacion = event.detail;
		adminInventoryStore.setSelections(selectedBodega, '', newUbicacion);

		if (newUbicacion) {
			fetchUbicaciones().then(() => {
				fetchMarcas();
			});
		}
		fetchProgressData();
	}

	function handleMarcaChange(event) {
		const newMarca = event.detail;
		adminInventoryStore.setSelections(selectedBodega, newMarca, selectedUbicacion);

		if (newMarca) {
			fetchMarcas().then(() => {
				fetchRecords();
			});
		}
		fetchProgressData();
	}

	// ===== DATA FETCHING FUNCTIONS =====
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

	async function fetchRecords() {
		if (!selectedBodega || !selectedUbicacion || !selectedMarca) {
			console.log('Missing parameters:', { selectedBodega, selectedUbicacion, selectedMarca });
			return;
		}

		adminInventoryStore.setLoading(true);
		try {
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

	async function fetchProgressData() {
		try {
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

	async function refreshData() {
		if (refreshTimeout) clearTimeout(refreshTimeout);

		if (selectedBodega && selectedMarca && selectedUbicacion) {
			refreshTimeout = setTimeout(async () => {
				await fetchRecords();
				await fetchProgressData();
			}, 300);
		}
	}

	// ===== LIFECYCLE =====
	onMount(async () => {
		console.log('Admin Inventory Component: onMount');
		adminInventoryStore.setLoading(true);
		try {
			await fetchBodegas();
			await fetchProgressData();
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
</script>

<!-- ===== MAIN TEMPLATE ===== -->
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

	<!-- Progress Tracking -->
	<AdminProgress {progressData} />

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
	<AdminTable 
		{records} 
		{selectedBodega} 
		{selectedMarca} 
		{selectedUbicacion} 
		{loading}
		on:validate={validateRecord}
	/>
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