<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { inventoryStore } from '$lib/stores/inventory';
	import { inventoryAPI } from '$lib/services/api';
	import { addToast } from '$lib/stores/toast';
	import { formatDateTime } from '$lib/utils/dateFormat';
	import BackToMenuButton from '$lib/BackToMenu.svelte';

	// Subscribe to the store
	$: ({
		bodegas,
		marcas,
		categoriasIncidencias,
		loading,
		error,
		selectedBodega,
		selectedMarca,
		ubicacion,
		currentProduct
	} = $inventoryStore);

	// Add these bindings for two-way binding with the store
	$: {
		if (selectedMarca !== $inventoryStore.selectedMarca) {
			inventoryStore.setSelectedMarca(selectedMarca);
		}
	}

	async function handleMarcaChange(event) {
		inventoryStore.setSelectedMarca(event.target.value);
	}

	async function handleUbicacionChange(event) {
		inventoryStore.setUbicacion(event.target.value);
	}

	// Form state variables
	let barcodeInput;
	let stockQuantityInput;
	let stockQuantity = 0;
	let incidencia = '';
	let selectedCategoriaIncidencia = '';
	let codigoBarras = '';

	onMount(async () => {
		//Reset the store when component mounts
		inventoryStore.reset();

		try {
			await Promise.all([inventoryAPI.fetchBodegas(), inventoryAPI.fetchCategoriasIncidencias()]);
		} catch (error) {
			addToast('Error loading initial data', 'error');
		}
	});

	onDestroy(() => {
		// Reset the store when component is destroyed
		inventoryStore.reset();
	});

	async function handleBodegaChange(event) {
		const bodega = event.target.value;
		inventoryStore.setSelectedBodega(bodega);
		if (bodega) {
			try {
				await inventoryAPI.fetchMarcas(bodega);
			} catch (error) {
				addToast('Error loading marcas', 'error');
			}
		}
	}

	async function handleBarcodeInput(event) {
		if (event.key === 'Enter' || event.key === 'Tab') {
			event.preventDefault();
			if (!ubicacion || !codigoBarras) {
				addToast('Favor introduzca ubicación y código del producto', 'error');
				return;
			}

			try {
				const data = await inventoryAPI.fetchProductDetails(
					selectedBodega,
					selectedMarca,
					codigoBarras
				);

				if (data.status === 'success' && data.data?.length > 0) {
					const product = data.data[0];
					stockQuantity = product.inventario_fisico || 0;
					incidencia = product.incidencia || '';
					selectedCategoriaIncidencia = product.categoria_incidencia || '';
					await tick();
					stockQuantityInput?.focus();
				} else {
					addToast('Producto no existe', 'error');
					resetFields();
				}
			} catch (error) {
				addToast('Error inesperado al buscar el producto', 'error');
				resetFields();
			}
		}
	}

	async function saveChanges() {
		const formData = {
			id: $inventoryStore.currentProduct.id,
			ubicacion: $inventoryStore.ubicacion,
			inventario_fisico: stockQuantity,
			categoria_incidencia: selectedCategoriaIncidencia,
			incidencia,
			single_item_ean13: $inventoryStore.currentProduct.single_item_ean13,
			master_carton_ean13: $inventoryStore.currentProduct.master_carton_ean13
		};

		console.log('Saving changes with data:', formData);

		try {
			const response = await fetch('/api/inventario/registro', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			const result = await response.json();

			if (response.ok && result.status === 'success') {
				addToast('Producto actualizado exitosamente!', 'success');
				resetFields();
			} else if (result.error?.code === 'NOT_FOUND') {
				addToast('Producto no encontrado o no se realizaron cambios', 'warning');
			} else {
				addToast(result.error?.message || 'Error al guardar el producto', 'error');
			}
		} catch (error) {
			console.error('Error saving changes:', error);
			addToast('Error de conexión al guardar el producto', 'error');
		}
	}

	function resetFields() {
		codigoBarras = '';
		stockQuantity = 0;
		incidencia = '';
		selectedCategoriaIncidencia = '';
		if (currentProduct) {
			currentProduct.single_item_ean13 = '';
			currentProduct.master_carton_ean13 = '';
		}
		inventoryStore.resetProduct();
		tick().then(() => barcodeInput?.focus());
	}

	function resetLocation() {
		inventoryStore.resetLocation();
		resetFields();
	}
</script>

<!-- Show loading state -->
{#if loading}
	<div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
		<div class="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
	</div>
{/if}

<div class="min-h-screen bg-gray-100 p-6">
	<h1 class="mb-4 text-2xl font-bold">Toma de Inventario por Marca</h1>

	<div>
		<BackToMenuButton />
	</div>

	<!-- Show error messages -->
	{#if error}
		<div
			class="relative mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700"
			role="alert"
		>
			<strong class="font-bold">Error!</strong>
			<span class="block sm:inline">{error}</span>
		</div>
	{/if}

	<!-- Filters -->
	<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
		<div>
			<label for="bodega" class="block text-sm font-medium text-gray-700">Bodega</label>
			<select
				id="bodega"
				value={selectedBodega}
				on:change={handleBodegaChange}
				class="w-full rounded border p-2"
			>
				<option value="">Seleccione Bodega</option>
				{#each bodegas as bodega}
					<option value={bodega}>{bodega}</option>
				{/each}
			</select>
		</div>

		{#if selectedBodega}
			<div>
				<label for="marca" class="block text-sm font-medium text-gray-700">Marca</label>
				<select
					id="marca"
					value={$inventoryStore.selectedMarca}
					on:change={handleMarcaChange}
					class="w-full rounded border p-2"
				>
					<option value="">Seleccione Marca</option>
					{#each marcas as marca}
						<option value={marca}>{marca}</option>
					{/each}
				</select>
			</div>
		{/if}

		{#if selectedBodega && selectedMarca}
			<div>
				<label for="ubicacion" class="block text-sm font-medium text-gray-700">
					Ubicación (Estante y Nivel)
				</label>
				<input
					type="text"
					id="ubicacion"
					value={$inventoryStore.ubicacion}
					on:input={handleUbicacionChange}
					placeholder="Escanear Ubicacion"
					class="w-full rounded border p-2"
				/>
			</div>
		{/if}
	</div>

	{#if selectedBodega && selectedMarca && ubicacion}
		<div class="mb-4">
			<label for="barcodeInput" class="block text-sm font-medium text-gray-700">
				Codigo de Barras / Numero de Parte / EAN13
			</label>
			<input
				type="text"
				id="barcodeInput"
				bind:value={codigoBarras}
				bind:this={barcodeInput}
				placeholder="Escanear el codigo de barras del producto"
				on:keydown={handleBarcodeInput}
				class="block w-full rounded border p-2"
			/>
		</div>
	{/if}

	<!-- Product Details -->
	{#if currentProduct}
		<div class="mb-4 rounded bg-white p-4 shadow">
			<div class="mb-4 grid grid-cols-2 gap-4">
				<p><strong>Codigo de Barras:</strong> {currentProduct.codigo_barras}</p>
				<p><strong>Numero Parte:</strong> {currentProduct.numero_parte}</p>
				<p><strong>Descripcion:</strong> {currentProduct.descripcion}</p>
				<p><strong>Fecha Inventario:</strong> {formatDateTime(currentProduct.fecha_inventario)}</p>
			</div>

			<div class="space-y-4">
				<!-- New EAN-13 fields -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label for="singleItemEan13" class="block text-sm font-medium text-gray-700">
							EAN-13 Unidad
						</label>
						<input
							id="singleItemEan13"
							type="text"
							bind:value={currentProduct.single_item_ean13}
							maxlength="13"
							placeholder="Escanear EAN-13 Unidad"
							class="mt-1 block w-full rounded border p-2"
						/>
					</div>

					<div>
						<label for="masterCartonEan13" class="block text-sm font-medium text-gray-700">
							EAN-13 Caja Master
						</label>
						<input
							id="masterCartonEan13"
							type="text"
							bind:value={currentProduct.master_carton_ean13}
							maxlength="13"
							placeholder="Escanear EAN-13 Caja Master"
							class="mt-1 block w-full rounded border p-2"
						/>
					</div>
				</div>

				<div>
					<label for="stockQuantity" class="block text-sm font-medium text-gray-700">
						Inventario Físico
					</label>
					<input
						id="stockQuantity"
						type="number"
						bind:value={stockQuantity}
						bind:this={stockQuantityInput}
						class="mt-1 block w-full rounded border p-2"
					/>
				</div>

				<div>
					<label for="categoriaIncidencia" class="block text-sm font-medium text-gray-700">
						Categoría Incidencia
					</label>
					<select
						id="categoriaIncidencia"
						bind:value={selectedCategoriaIncidencia}
						class="mt-1 block w-full rounded border p-2"
					>
						<option value="">Seleccione una Categoria</option>
						{#each categoriasIncidencias as categoria}
							<option value={categoria}>{categoria}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="incidencia" class="block text-sm font-medium text-gray-700"> Notas </label>
					<textarea
						id="incidencia"
						bind:value={incidencia}
						class="mt-1 block w-full rounded border p-2"
					></textarea>
				</div>

				<div class="mt-4 flex gap-4">
					<button
						on:click={saveChanges}
						class="rounded bg-green-500 p-2 text-white transition-colors hover:bg-green-600"
					>
						Guardar
					</button>
					<button
						on:click={resetFields}
						class="rounded bg-gray-500 p-2 text-white transition-colors hover:bg-gray-600"
					>
						Cancelar
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Location Reset Button -->
	{#if selectedBodega && selectedMarca && ubicacion && !codigoBarras}
		<button
			on:click={resetLocation}
			class="mt-4 rounded bg-red-500 p-2 text-white transition-colors hover:bg-red-600"
		>
			Seleccione otra Ubicación
		</button>
	{/if}
</div>
