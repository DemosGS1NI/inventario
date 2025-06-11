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
			const result = await res.json();

			// Access the nested data structure
			items = result.data.items;
			totalPages = result.data.pagination.totalPages;
			totalRecords = result.data.pagination.totalRecords;
			currentPage = page;

		} catch (error) {
			console.error('Error fetching data:', error);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchPage();
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
	<div class="text-center text-xs text-gray-500 mt-1">
		Se han dejado columnas sin mostrar de manera intencionada
	</div>


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
					<!-- CORE COLUMNS - Always visible -->
					<th class="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">ID</th>
					<th class="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">Bodega</th>

					
					<!-- TABLET+ COLUMNS - Show on medium screens and up -->
					<th class="hidden md:table-cell border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">Marca</th>

					
					<!-- DESKTOP+ COLUMNS - Show on large screens and up -->
					<th class="hidden lg:table-cell border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">Código de Barras</th>
					<th class="hidden lg:table-cell border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">Número de Parte</th>
					<th class="hidden lg:table-cell border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">Descripción</th>
					<th class="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">Inv. Sistema</th>
					
					<!-- OPTIONAL COLUMNS - Uncomment to show if needed -->
					<!-- <th class="hidden xl:table-cell border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">Ubicación</th> -->
					<!-- <th class="hidden xl:table-cell border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">GTIN</th> -->
					<!-- <th class="hidden xl:table-cell border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">Single Item EAN13</th> -->
					<!-- <th class="hidden xl:table-cell border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">Master Carton EAN13</th> -->
				</tr>
			</thead>
			<tbody>
				{#each items as item}
					<tr class="transition-colors hover:bg-gray-50">
						<!-- CORE COLUMNS - Always visible -->
						<td class="border-b border-gray-200 px-4 py-3 text-center text-sm text-gray-800">{item.id}</td>
						<td class="border-b border-gray-200 px-4 py-3 text-center text-sm text-gray-800">{item.bodega}</td>

						
						<!-- TABLET+ COLUMNS - Show on medium screens and up -->
						<td class="hidden md:table-cell border-b border-gray-200 px-4 py-3 text-center text-sm text-gray-800">{item.marca}</td>

						
						<!-- DESKTOP+ COLUMNS - Show on large screens and up -->
						<td class="hidden lg:table-cell border-b border-gray-200 px-4 py-3 text-center text-sm text-gray-800">{item.codigo_barras}</td>
						<td class="hidden lg:table-cell border-b border-gray-200 px-4 py-3 text-center text-sm text-gray-800">{item.numero_parte}</td>
					    <td class="hidden lg:table-cell border-b border-gray-200 px-4 py-3 text-center text-sm text-gray-800">{item.descripcion}</td>
                        <td class="border-b border-gray-200 px-4 py-3 text-center text-sm text-gray-800">{item.inventario_sistema}</td>
						
						<!-- OPTIONAL COLUMNS - Uncomment to show if needed -->
						<!-- <td class="hidden xl:table-cell border-b border-gray-200 px-4 py-3 text-center text-sm text-gray-800">{item.ubicacion}</td> -->
						<!-- <td class="hidden xl:table-cell border-b border-gray-200 px-4 py-3 text-center text-sm text-gray-800">{item.gtin}</td> -->
						<!-- <td class="hidden xl:table-cell border-b border-gray-200 px-4 py-3 text-center text-sm text-gray-800">{item.single_item_ean13}</td> -->
						<!-- <td class="hidden xl:table-cell border-b border-gray-200 px-4 py-3 text-center text-sm text-gray-800">{item.master_carton_ean13}</td> -->
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="px-4 py-8 text-center text-gray-500">
							No hay datos disponibles
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination Controls -->
	<div class="flex flex-col items-center justify-between gap-4 rounded-lg bg-white p-4 shadow-md sm:flex-row">
		<button
			on:click={() => changePage(currentPage - 1)}
			disabled={currentPage === 1 || loading}
			class="rounded-lg bg-blue-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
		>
			← Anterior
		</button>
		
		<div class="text-center">
			<div class="text-sm font-medium text-gray-700">
				Página {currentPage} de {totalPages}
			</div>
			{#if totalRecords > 0}
				<div class="text-xs text-gray-500 mt-1">
					Registros {startRecord}-{endRecord} de {totalRecords}
				</div>
			{/if}
		</div>

		<button
			on:click={() => changePage(currentPage + 1)}
			disabled={currentPage === totalPages || loading}
			class="rounded-lg bg-blue-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
		>
			Siguiente →
		</button>
	</div>
</div>