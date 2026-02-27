<script>
	import { createEventDispatcher } from 'svelte';
	import { CheckCircle, XCircle, ChevronDown } from 'lucide-svelte';
	import { formatDateTime } from '$lib/utils/dateFormat';
	import {
		calculateDiferencia,
		calculateTipoDiferencia,
		getMovementSummary
	} from './adminHelpers.js';

	const dispatch = createEventDispatcher();

	export let records = [];
	export let selectedBodega = '';
	export let selectedMarca = '';
	export let selectedUbicacion = '';
	export let loading = false;

	let expandedRows = new Set();

	const formatNumber = (value) => {
		if (value === null || value === undefined || value === '') return '';
		const num = Number(value);
		if (Number.isNaN(num)) return value;
		return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	};

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

	function toggleDetails(id) {
		const next = new Set(expandedRows);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		expandedRows = next;
	}
</script>

<!-- Records Table -->
{#if records.length > 0}
	<div class="overflow-x-auto rounded-lg bg-white shadow">
		<table class="min-w-[1100px] divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					<th
						class="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
					>
						Código
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
						>Descripción</th
					>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
						>Sistema</th
					>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
						>Físico</th
					>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
						>Dif</th
					>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
						>Tipo</th
					>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
						>Movimientos</th
					>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
						>Incidencia</th
					>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
						>Inventariante</th
					>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
						>Fecha</th
					>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
						>Estado</th
					>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
						>Detalles</th
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
						<td class="px-6 py-4">{record.descripcion}</td>
						<td class="whitespace-nowrap px-6 py-4 text-right">{formatNumber(record.inventario_sistema)}</td>
						<td class="whitespace-nowrap px-6 py-4 text-right">{formatNumber(record.inventario_fisico)}</td>
						<td class="whitespace-nowrap px-6 py-4 text-right">
							{formatNumber(
								calculateDiferencia(
									record.inventario_sistema,
									record.inventario_fisico,
									record.fecha_inventario
								)
							)}
						</td>
						<td class="whitespace-nowrap px-6 py-4">
							{#if calculateTipoDiferencia(record.inventario_sistema, record.inventario_fisico, record.fecha_inventario) === 'Faltante'}
								<span
									class="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800"
								>
									{calculateTipoDiferencia(
										record.inventario_sistema,
										record.inventario_fisico,
										record.fecha_inventario
									)}
								</span>
							{:else if calculateTipoDiferencia(record.inventario_sistema, record.inventario_fisico, record.fecha_inventario) === 'Sobrante'}
								<span
									class="inline-flex rounded-full bg-yellow-100 px-2 text-xs font-semibold leading-5 text-yellow-800"
								>
									{calculateTipoDiferencia(
										record.inventario_sistema,
										record.inventario_fisico,
										record.fecha_inventario
									)}
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
								<span class="font-medium text-gray-600">-</span>
							{/if}
						</td>
						<td class="px-6 py-4">{record.incidencia}</td>
						<td class="whitespace-nowrap px-6 py-4">{record.nombre}</td>
						<td class="whitespace-nowrap px-6 py-4">{formatDateTime(record.fecha_inventario)}</td>
						<td class="whitespace-nowrap px-6 py-4">
							{#if record.validado}
								<span class="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
									Validado
								</span>
							{:else}
								<span class="inline-flex rounded-full bg-gray-200 px-2 text-xs font-semibold leading-5 text-gray-700">
									Pendiente
								</span>
							{/if}
						</td>
						<td class="px-6 py-4">
							<button
								class="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
								on:click={() => toggleDetails(record.id)}
								type="button"
							>
								<ChevronDown size={18} class={expandedRows.has(record.id) ? 'rotate-180 transition-transform' : 'transition-transform'} />
								{expandedRows.has(record.id) ? 'Ocultar' : 'Ver'}
							</button>
						</td>
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
					{#if expandedRows.has(record.id)}
						<tr class="bg-gray-50">
							<td class="px-6 py-3 text-sm text-gray-700" colspan="13">
								<div class="flex flex-wrap gap-6">
									<div><span class="font-semibold">Bodega:</span> {record.bodega}</div>
									<div><span class="font-semibold">Ubicación:</span> {record.ubicacion}</div>
									<div><span class="font-semibold">Marca:</span> {record.marca}</div>
									{#if record.numero_parte}
										<div><span class="font-semibold">Número de Parte:</span> {record.numero_parte}</div>
									{/if}
									{#if record.single_item_ean13}
										<div><span class="font-semibold">Item EAN13:</span> {record.single_item_ean13}</div>
									{/if}
									{#if record.master_carton_ean13}
										<div><span class="font-semibold">Caja EAN13:</span> {record.master_carton_ean13}</div>
									{/if}
								</div>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{:else if selectedBodega && selectedMarca && selectedUbicacion && !loading}
	<div class="py-8 text-center text-gray-500">No se encontraron registros.</div>
{/if}
