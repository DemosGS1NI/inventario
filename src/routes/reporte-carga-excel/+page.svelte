<script>
	import { onMount } from 'svelte';
	import BackToMenuButton from '$lib/BackToMenu.svelte'; // Import the reusable button component

	let items = [];
	let currentPage = 1;
	let totalPages = 1;
	let pageSize = 10;
	let totalRecords = 0;
	let loading = false;

	async function fetchPage(page = 1) {
		loading = true;
		try {
			const res = await fetch(`/api/reporte-carga-excel?page=${page}&limit=${pageSize}`);
			if (!res.ok) {
				throw new Error(`HTTP error! status: ${res.status}`);
			}
			const result = await res.json();

			if (result.status === 'success') {
				items = result.data.items || [];
				totalPages = result.data?.pagination?.totalPages || 1;
				totalRecords = result.data?.pagination?.totalRecords || 0;
				currentPage = page;
			} else {
				console.error('❌ Error en la respuesta:', result.message || 'Error desconocido');
				items = [];
				totalPages = 1;
				totalRecords = 0;
			}
		} catch (error) {
			console.error('❌ Error al obtener datos:', error);
			items = [];
			totalPages = 1;
			totalRecords = 0;
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await fetchPage(1);
	});

	function changePage(page) {
		if (page >= 1 && page <= totalPages) {
			fetchPage(page);
		}
	}

	// Calculate pagination display values
	$: startRecord = (currentPage - 1) * pageSize + 1;
	$: endRecord = Math.min(currentPage * pageSize, totalRecords);
</script>

<div class="flex min-h-screen flex-col bg-gray-100 p-6">
	<!-- Title -->
	<h1 class="mb-6 text-center text-3xl font-bold text-gray-800">
		Reporte de Resultado de Carga EXCEL
	</h1>
	<div class="mt-1 text-center text-xs text-gray-500">Mostrando todas las columnas importadas</div>

	<!-- Back to Main Menu Button -->
	<div class="mb-6">
		<BackToMenuButton />
	</div>

	<!-- Loading Indicator -->
	{#if loading}
		<div class="mb-4 flex justify-center">
			<div class="text-lg text-gray-600">Cargando datos...</div>
		</div>
	{/if}

	<!-- Report Table -->
	<div class="mb-6 overflow-x-auto rounded-lg shadow-lg">
		<table class="min-w-full border border-gray-300 bg-white">
			<thead>
				<tr class="bg-gray-200">
					<th class="border-b border-gray-300 px-3 py-3 text-center text-xs font-semibold text-gray-700">
						ID
					</th>
					<th class="border-b border-gray-300 px-3 py-3 text-center text-xs font-semibold text-gray-700">
						Bodega
					</th>
					<th class="border-b border-gray-300 px-3 py-3 text-center text-xs font-semibold text-gray-700">
						Marca
					</th>
					<th class="border-b border-gray-300 px-3 py-3 text-center text-xs font-semibold text-gray-700">
						Ubicación
					</th>
					<th class="border-b border-gray-300 px-3 py-3 text-center text-xs font-semibold text-gray-700">
						Código
					</th>
					<th class="border-b border-gray-300 px-3 py-3 text-center text-xs font-semibold text-gray-700">
						N.º Parte
					</th>
					<th class="border-b border-gray-300 px-3 py-3 text-center text-xs font-semibold text-gray-700">
						Descripción
					</th>
					<th class="border-b border-gray-300 px-3 py-3 text-center text-xs font-semibold text-gray-700">
						Inv. Sistema
					</th>
					<th class="border-b border-gray-300 px-3 py-3 text-center text-xs font-semibold text-gray-700">
						GTIN
					</th>
					<th class="border-b border-gray-300 px-3 py-3 text-center text-xs font-semibold text-gray-700">
						DUN
					</th>
				</tr>
			</thead>
			<tbody>
				{#if items && items.length > 0}
					{#each items as item}
						<tr class="transition-colors hover:bg-gray-50">
							<td class="border-b border-gray-200 px-3 py-2 text-center text-sm text-gray-800"
								>{item.id}</td>
							<td class="border-b border-gray-200 px-3 py-2 text-center text-sm text-gray-800"
								>{item.bodega}</td>
							<td class="border-b border-gray-200 px-3 py-2 text-center text-sm text-gray-800"
								>{item.marca}</td>
							<td class="border-b border-gray-200 px-3 py-2 text-center text-sm text-gray-800"
								>{item.ubicacion}</td>
							<td class="border-b border-gray-200 px-3 py-2 text-center text-sm text-gray-800"
								>{item.codigo_barras}</td>
							<td class="border-b border-gray-200 px-3 py-2 text-center text-sm text-gray-800"
								>{item.numero_parte}</td>
							<td class="border-b border-gray-200 px-3 py-2 text-center text-sm text-gray-800"
								>{item.descripcion}</td>
							<td class="border-b border-gray-200 px-3 py-2 text-center text-sm text-gray-800"
								>{item.inventario_sistema}</td>
							<td class="border-b border-gray-200 px-3 py-2 text-center text-sm text-gray-800"
								>{item.gtin}</td>
							<td class="border-b border-gray-200 px-3 py-2 text-center text-sm text-gray-800"
								>{item.master_carton_ean13}</td>
						</tr>
					{/each}
				{:else if !loading}
					<tr>
						<td colspan="7" class="px-4 py-8 text-center text-gray-500">
							No hay datos disponibles
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Pagination Controls -->
	<div
		class="flex flex-col items-center justify-between gap-4 rounded-lg bg-white p-4 shadow-md sm:flex-row"
	>
		<button
			on:click={() => changePage(currentPage - 1)}
			disabled={currentPage === 1 || loading}
			class="rounded-lg bg-blue-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
		>
			← Anterior
		</button>

		<div class="text-center">
			<div class="text-sm font-medium text-gray-700">
				Página {currentPage} de {totalPages}
			</div>
			{#if totalRecords > 0}
				<div class="mt-1 text-xs text-gray-500">
					Registros {startRecord}-{endRecord} de {totalRecords}
				</div>
			{/if}
		</div>

		<button
			on:click={() => changePage(currentPage + 1)}
			disabled={currentPage === totalPages || loading || totalPages === 0}
			class="rounded-lg bg-blue-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
		>
			Siguiente →
		</button>
	</div>
</div>
