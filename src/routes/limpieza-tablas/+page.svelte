<script>
	import { onMount } from 'svelte';
	import BackToMenu from '$lib/BackToMenu.svelte';
	import { addToast } from '$lib/stores/toast';

	let loading = false;

	async function cleanInventoryTable() {
		if (
			!confirm(
				'¿Está seguro que desea limpiar las tablas de inventario y movimientos? Esta acción no se puede deshacer.'
			)
		) {
			return;
		}

		loading = true;
		try {
			const response = await fetch('/api/inventario', {
				method: 'DELETE',
				headers: {
					'X-Confirm-Delete': 'DELETE-ALL-INVENTORY'
				}
			});

			const data = await response.json();

			if (response.ok && data.status === 'success') {
				const inventarioCount = data.data.deletedInventarioCount;
				const movimientosCount = data.data.deletedMovimientosCount;
				addToast(
					`Limpieza completada. ${inventarioCount} registros de inventario y ${movimientosCount} registros de movimientos eliminados.`,
					'success'
				);
			} else {
				throw new Error(data.message || 'Error al limpiar las tablas');
			}
		} catch (error) {
			console.error('Error:', error);
			addToast('Error al limpiar las tablas: ' + error.message, 'error');
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-100 p-6">
	<h1 class="mb-4 text-2xl font-bold">Limpieza de Tablas</h1>

	<BackToMenu />

	<div class="mt-6 space-y-6">
		<!-- Inventory Table Cleanup -->

		<!-- Update the description in limpieza-tablas/+page.svelte -->
		<div class="rounded-lg bg-white p-6 shadow">
			<h2 class="mb-4 text-xl font-semibold">Tablas de Inventario y Movimientos</h2>
			<p class="mb-4 text-gray-600">
				Esta opción limpiará todos los registros de las tablas de inventario y movimientos. Use esta
				opción cuando necesite iniciar un nuevo proceso de inventario.
			</p>
			<button
				class="rounded bg-red-500 px-6 py-2 text-white transition-colors
           hover:bg-red-600 disabled:cursor-not-allowed
           disabled:bg-gray-400"
				on:click={cleanInventoryTable}
				disabled={loading}
			>
				{#if loading}
					<span class="inline-block">Limpiando...</span>
				{:else}
					<span class="inline-block">Limpiar Tablas de Inventario y Movimientos</span>
				{/if}
			</button>
		</div>
	</div>
</div>
