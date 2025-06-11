<script>
	import { createEventDispatcher } from 'svelte';
	import { CheckCircle, XCircle } from 'lucide-svelte';
	import { formatDateTime } from '$lib/utils/dateFormat';
	import { calculateDiferencia, calculateTipoDiferencia, getMovementSummary } from './adminHelpers.js';
	
	const dispatch = createEventDispatcher();
	
	export let records = [];
	export let selectedBodega = '';
	export let selectedMarca = '';
	export let selectedUbicacion = '';
	export let loading = false;
	
	// Touch feedback handlers
	function handleTouchStart(event) {
		event.target.classList.add('active');
	}

	function handleTouchEnd(event) {
		event.target.classList.remove('active');
	}
	
	function handleValidate(record) {
		dispatch('validate', record);
	}
</script>

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
									{calculateTipoDiferencia(record.inventario_sistema, record.inventario_fisico, record.fecha_inventario)}
								</span>
							{:else if calculateTipoDiferencia(record.inventario_sistema, record.inventario_fisico, record.fecha_inventario) === 'Sobrante'}
								<span
									class="inline-flex rounded-full bg-yellow-100 px-2 text-xs font-semibold leading-5 text-yellow-800"
								>
									{calculateTipoDiferencia(record.inventario_sistema, record.inventario_fisico, record.fecha_inventario)}
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

						<!-- Movement display -->
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
								on:click={() => handleValidate(record)}
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
{:else if selectedBodega && selectedMarca && selectedUbicacion && !loading}
	<div class="py-8 text-center text-gray-500">No se encontraron registros.</div>
{/if}