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

	// async function handleMarcaChange(event) {
	//     inventoryStore.setSelectedMarca(event.target.value);
	// }

	// Form state variables
	let barcodeInput;
	let loteInput;
	let stockQuantityInput;
	let stockQuantity = 0;
	let notas = '';
	let selectedCategoriaIncidencia = '';
	let codigoBarras = '';
	let lote = '';
	let showTareModal = false;
	let tareValue = 0;
	let grossWeight = '';
	let netWeight = 0;

	function decodeGs1(value) {
		const result = { code: null, lote: null, unsupported: [] };
		if (!value) return result;

		const matches = [...value.matchAll(/\((\d{2,4})\)/g)];
		if (!matches.length) return result;

		matches.forEach((match, idx) => {
			const ai = match[1];
			const valueStart = match.index + match[0].length;
			const valueEnd = idx + 1 < matches.length ? matches[idx + 1].index : value.length;
			const aiValue = value.slice(valueStart, valueEnd).trim();

			switch (ai) {
				case '91':
					result.code = aiValue;
					break;
				case '10':
					result.lote = aiValue;
					break;
				default:
					result.unsupported.push(ai);
			}
		});

		return result;
	}

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

		await tick();
		barcodeInput?.focus();
	}

	async function handleBarcodeInput(event) {
		if (event.key === 'Enter' || event.key === 'Tab') {
			event.preventDefault();

			const { code, lote: loteFromScan, unsupported } = decodeGs1(codigoBarras);
			if (unsupported.length) {
				addToast(`AI no soportado: ${unsupported.join(', ')}`, 'warning');
			}
			if (code) {
				codigoBarras = code;
			}
			if (loteFromScan) {
				lote = loteFromScan;
			}

			const trimmedCodigo = codigoBarras.trim();
			const trimmedLote = (loteFromScan ?? lote).trim();

			if (!selectedBodega) {
				addToast('Seleccione una bodega antes de buscar', 'error');
				return;
			}

			if (!trimmedCodigo) {
				addToast('Favor introduzca código del producto', 'error');
				return;
			}

			// If lote already present (e.g., QR with AIs), perform lookup now; otherwise move to lote input
			if (trimmedLote) {
				await performLookup(trimmedCodigo, trimmedLote);
			} else {
				await tick();
				loteInput?.focus();
			}
		}
	}

	async function handleLoteInput(event) {
		if (event.key === 'Enter' || event.key === 'Tab') {
			event.preventDefault();

			const { code, lote: loteFromScan, unsupported } = decodeGs1(lote || codigoBarras);
			if (unsupported.length) {
				addToast(`AI no soportado: ${unsupported.join(', ')}`, 'warning');
			}
			if (code) {
				codigoBarras = code;
			}
			if (loteFromScan !== null && loteFromScan !== undefined) {
				lote = loteFromScan;
			}

			const trimmedCodigo = codigoBarras.trim();
			const trimmedLote = lote.trim();

			if (!selectedBodega) {
				addToast('Seleccione una bodega antes de buscar', 'error');
				return;
			}

			if (!trimmedCodigo) {
				addToast('Favor introduzca código del producto', 'error');
				return;
			}

			await performLookup(trimmedCodigo, trimmedLote || '');
		}
	}

	async function performLookup(trimmedCodigo, trimmedLote) {
		try {
			const data = await inventoryAPI.fetchProductDetails(
				selectedBodega,
				null,
				trimmedCodigo,
				trimmedLote
			);

			if (data.status === 'success' && data.data?.length > 0) {
				const product = data.data[0];
				stockQuantity = product.inventario_fisico || 0;
				notas = product.notas || '';
				selectedCategoriaIncidencia = product.categoria_incidencia || '';
				await tick();
				stockQuantityInput?.focus();
			} else {
				addToast('Producto y Lote no existe', 'error');
				resetFields();
			}
		} catch (error) {
			addToast('Error inesperado al buscar el producto', 'error');
			resetFields();
		}
	}

	async function saveChanges() {
		if (!$inventoryStore.currentProduct) {
			addToast('No hay producto seleccionado para guardar', 'error');
			return;
		}

		const parsedQuantity = Number(stockQuantity);
		if (Number.isNaN(parsedQuantity)) {
			addToast('Inventario físico inválido', 'error');
			return;
		}

		const formData = {
			id: $inventoryStore.currentProduct.id,
			inventario_fisico: parsedQuantity,
			categoria_incidencia: selectedCategoriaIncidencia,
			notas
		};

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
			} else if (!response.ok) {
				addToast(result.error?.message || 'Error al guardar el producto', 'error');
			} else {
				addToast(result.error?.message || 'Error al guardar el producto', 'error');
			}
		} catch (error) {
			addToast('Error de conexión al guardar el producto', 'error');
		}
	}



	function resetFields() {
		codigoBarras = '';
		stockQuantity = 0;
		notas = '';
		selectedCategoriaIncidencia = '';
		lote = '';
		inventoryStore.resetProduct();
		tick().then(() => barcodeInput?.focus());
	}

	function resetLocation() {
		inventoryStore.resetLocation();
		resetFields();
	}

	function openTareModal() {
		tareValue = Number(currentProduct?.tare) || 0;
		grossWeight = '';
		netWeight = 0;
		showTareModal = true;
	}

	function closeTareModal() {
		showTareModal = false;
	}

	function updateNetWeight() {
		const gross = Number(grossWeight);
		const tareNum = Number(tareValue);
		if (Number.isNaN(gross) || Number.isNaN(tareNum)) {
			netWeight = 0;
			return;
		}
		netWeight = Math.max(gross - tareNum, 0);
	}

	function applyNetToStock() {
		const current = Number(stockQuantity) || 0;
		const added = Number(netWeight) || 0;
		stockQuantity = current + added;

		const now = new Date();
		const hh = String(now.getHours()).padStart(2, '0');
		const mm = String(now.getMinutes()).padStart(2, '0');
		const loteLabel = lote || currentProduct?.lote || '';
		const noteLine = `${currentProduct?.codigo || ''} lote ${loteLabel} neto ${added} (${hh}:${mm})`;
		notas = notas ? `${notas}\n${noteLine}` : noteLine;

		showTareModal = false;
		tick().then(() => stockQuantityInput?.focus());
	}
</script>

<!-- Show loading state -->
{#if loading}
	<div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
		<div class="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
	</div>
{/if}

<div class="min-h-screen bg-gray-100 p-6">
	<h1 class="mb-4 text-2xl font-bold">Toma de Inventario por Producto</h1>

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
				bind:value={selectedBodega}
				on:change={handleBodegaChange}
				class="w-full rounded border p-2"
			>
				<option value="">Seleccione Bodega</option>
				{#each bodegas as bodega}
					<option value={bodega}>{bodega}</option>
				{/each}
			</select>
		</div>

	</div>


	<div class="mb-4">
		<label for="barcodeInput" class="block text-sm font-medium text-gray-700">
			Codigo Interno, Numero de Parte o GTIN13
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

	<div class="mb-4">
		<label for="loteInput" class="block text-sm font-medium text-gray-700">Lote</label>
		<input
			type="text"
			id="loteInput"
			bind:value={lote}
			bind:this={loteInput}
			placeholder="Ingrese o escanee el lote"
			on:keydown={handleLoteInput}
			class="block w-full rounded border p-2"
		/>
	</div>
	<!-- {/if} -->

	<!-- Product Details -->
	{#if currentProduct}
		<div class="mb-4 rounded bg-white p-4 shadow">
			<div class="mb-4 grid grid-cols-2 gap-4">
				<p><strong>Código:</strong> {currentProduct.codigo}</p>
				<p><strong>Número Parte:</strong> {currentProduct.numero_parte}</p>
				<p><strong>Descripción:</strong> {currentProduct.descripcion}</p>
				<p><strong>Lote:</strong> {currentProduct.lote}</p>
				<p><strong>Unidad Medida:</strong> {currentProduct.unidad_medida}</p>
				<p><strong>Tare:</strong> {currentProduct.tare}</p>
				<p><strong>GTIN:</strong> {currentProduct.gtin}</p>
				<p><strong>DUN14:</strong> {currentProduct.dun14}</p>
				<p><strong>Fecha Inventario:</strong> {formatDateTime(currentProduct.fecha_inventario)}</p>
			</div>

			<div class="space-y-4">
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
					<button
						type="button"
						on:click={openTareModal}
						class="mt-2 rounded bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
					>
						Calcular con tare
					</button>
				</div>

				<div>
					<label for="notas" class="block text-sm font-medium text-gray-700"> Notas </label>
					<textarea
						id="notas"
						bind:value={notas}
						class="mt-1 block w-full rounded border p-2"
					></textarea>
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

	{#if showTareModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
			<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
				<h2 class="mb-4 text-lg font-semibold">Calcular peso neto</h2>
				<div class="space-y-4">
					<p class="text-sm text-gray-700">Inventario actual: {stockQuantity}</p>
					<div>
						<label for="tareModal" class="block text-sm font-medium text-gray-700">Tare (contenedor)</label>
						<input
							id="tareModal"
							type="number"
							bind:value={tareValue}
							on:input={updateNetWeight}
							class="mt-1 block w-full rounded border p-2"
						/>
					</div>
					<div>
						<label for="grossModal" class="block text-sm font-medium text-gray-700">Peso bruto</label>
						<input
							id="grossModal"
							type="number"
							bind:value={grossWeight}
							on:input={updateNetWeight}
							class="mt-1 block w-full rounded border p-2"
						/>
					</div>
					<div>
						<label for="netModal" class="block text-sm font-medium text-gray-700">Peso neto</label>
						<input
							id="netModal"
							type="number"
							value={netWeight}
							readonly
							class="mt-1 block w-full rounded border bg-gray-100 p-2"
						/>
					</div>
				</div>
				<div class="mt-6 flex justify-end gap-3">
					<button
						type="button"
						on:click={closeTareModal}
						class="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
					>
						Cancelar
					</button>
					<button
						type="button"
						on:click={applyNetToStock}
						class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
					>
						Usar peso neto
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
