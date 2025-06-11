<script>
	import { ChevronDown } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher();
	
	export let bodegas = [];
	export let marcas = [];
	export let ubicaciones = [];
	export let selectedBodega = '';
	export let selectedMarca = '';
	export let selectedUbicacion = '';
	
	function handleBodegaChange(event) {
		dispatch('bodegaChange', event.target.value);
	}
	
	function handleUbicacionChange(event) {
		dispatch('ubicacionChange', event.target.value);
	}
	
	function handleMarcaChange(event) {
		dispatch('marcaChange', event.target.value);
	}
</script>

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