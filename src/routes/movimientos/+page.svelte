<script>
	import { onMount, tick } from 'svelte';
	import { addToast } from '$lib/stores/toast';
	import BackToMenuButton from '$lib/BackToMenu.svelte';
	import { inventoryAPI } from '$lib/services/api';

	// Data variables - following existing patterns
	let bodegas = [];
	let marcas = [];
	let selectedBodega = '';
	let selectedMarca = '';
	let codigoBarras = '';
	let numeroDocumento = '';
	let comentarios = '';
	let tipoMovimiento = '';
	let cantidad = 0;
	let loading = false;

	// Product details (when found)
	let product = null;

	// Movement types
	const tiposMovimiento = [
		{ value: 'IN', label: 'Entrada' },
		{ value: 'OUT', label: 'Salida' }
	];

	onMount(async () => {
		console.log('🔄 [movimientos] Component mounted');
		await fetchBodegas();
	});

	async function fetchBodegas() {
		console.log('🔍 [movimientos] Fetching bodegas');
		try {
			const result = await inventoryAPI.fetchBodegas();
			if (result.status === 'success') {
				bodegas = result.data;
				console.log('✅ [movimientos] Bodegas loaded:', { count: bodegas.length });
			} else {
				console.error('❌ [movimientos] Error loading bodegas:', result.message);
				addToast('Error al cargar bodegas: ' + (result.message || 'Error desconocido'), 'error');
			}
		} catch (error) {
			console.error('❌ [movimientos] Error loading bodegas:', error);
			addToast('Error al cargar bodegas: ' + error.message, 'error');
		}
	}

	async function fetchMarcas() {
		if (!selectedBodega) {
			console.log('⚠️ [movimientos] Missing required field for marcas:', { selectedBodega });
			return;
		}

		console.log('🔍 [movimientos] Fetching marcas:', { selectedBodega });
		try {
			const result = await inventoryAPI.fetchMarcas(selectedBodega);
			if (result.status === 'success') {
				marcas = result.data;
				console.log('✅ [movimientos] Marcas loaded:', { count: marcas.length });
			} else {
				console.error('❌ [movimientos] Error loading marcas:', result.message);
				addToast('Error al cargar marcas: ' + (result.message || 'Error desconocido'), 'error');
			}
		} catch (error) {
			console.error('❌ [movimientos] Error loading marcas:', error);
			addToast('Error al cargar marcas: ' + error.message, 'error');
		}
	}

	async function fetchProductDetails() {
		if (!selectedBodega || !selectedMarca || !codigoBarras) return;

		try {
			const result = await inventoryAPI.fetchProductDetails(
				selectedBodega,
				selectedMarca,
				codigoBarras
			);
			if (result.status === 'success' && result.data.length > 0) {
				product = result.data[0];
				addToast('Producto encontrado', 'success');
			} else {
				product = null;
				addToast('Producto no encontrado', 'error');
			}
		} catch (error) {
			product = null;
			addToast('Error al buscar producto: ' + error.message, 'error');
		}
	}

	async function handleBodegaChange(event) {
		selectedBodega = event.target.value;
		console.log('🔄 [movimientos] Bodega changed:', selectedBodega);
		selectedMarca = '';
		marcas = [];
		product = null;
		codigoBarras = '';
		if (selectedBodega) {
			await fetchMarcas();
		}
	}

	async function handleMarcaChange(event) {
		selectedMarca = event.target.value;
		product = null;
		codigoBarras = '';
	}

	async function handleBarcodeInput(event) {
		if (event.key === 'Enter' || event.key === 'Tab') {
			event.preventDefault();
			if (codigoBarras.trim()) {
				await fetchProductDetails();
			}
		}
	}

	async function saveMovement() {
		// Validation
		if (
			!selectedBodega ||
			!selectedMarca ||
			!codigoBarras ||
			!tipoMovimiento ||
			!numeroDocumento.trim() ||
			!cantidad
		) {
			addToast('Por favor complete todos los campos requeridos', 'error');
			return;
		}

		if (cantidad <= 0) {
			addToast('La cantidad debe ser mayor a cero', 'error');
			return;
		}

		loading = true;

		try {
			const payload = {
				bodega: selectedBodega,
				ubicacion: product?.ubicacion || '',
				marca: selectedMarca,
				codigo_barras: product?.codigo_barras,
				numero_parte: product?.numero_parte || '',
				descripcion: product?.descripcion || '',
				tipo_movimiento: tipoMovimiento,
				cantidad: parseInt(cantidad),
				numero_documento: numeroDocumento.trim(),
				comentarios: comentarios.trim()
			};

			const res = await fetch('/api/db/movimientos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const data = await res.json();

			if (res.ok && data.status === 'success') {
				addToast('Movimiento registrado exitosamente', 'success');
				resetForm();
			} else {
				addToast('Error al guardar: ' + (data.error?.message || 'Error desconocido'), 'error');
			}
		} catch (error) {
			addToast('Error de conexión: ' + error.message, 'error');
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		codigoBarras = '';
		numeroDocumento = '';
		comentarios = '';
		tipoMovimiento = '';
		cantidad = 0;
		product = null;
	}
</script>

<div class="min-h-screen bg-gray-100 p-6">
	<h1 class="mb-4 text-2xl font-bold">Gestión de Movimientos</h1>

	<div class="mb-6">
		<BackToMenuButton />
	</div>

	<!-- Filters -->
	<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
		<!-- Bodega Selection -->
		<div>
			<label for="bodega" class="block text-sm font-medium text-gray-700">Bodega *</label>
			<select
				id="bodega"
				value={selectedBodega}
				on:change={handleBodegaChange}
				class="w-full rounded border p-2 focus:border-blue-500 focus:ring-blue-500"
			>
				<option value="">Seleccionar Bodega</option>
				{#each bodegas as bodega}
					<option value={bodega}>{bodega}</option>
				{/each}
			</select>
		</div>

		<!-- Marca Selection -->
		{#if selectedBodega}
			<div>
				<label for="marca" class="block text-sm font-medium text-gray-700">Marca *</label>
				<select
					id="marca"
					value={selectedMarca}
					on:change={handleMarcaChange}
					class="w-full rounded border p-2 focus:border-blue-500 focus:ring-blue-500"
				>
					<option value="">Seleccionar Marca</option>
					{#each marcas as marca}
						<option value={marca}>{marca}</option>
					{/each}
				</select>
			</div>
		{/if}
	</div>

	<!-- Product Code Input -->
	{#if selectedMarca}
		<div class="mb-4">
			<label for="codigoBarras" class="block text-sm font-medium text-gray-700">
				Código de Barras / Número de Parte / EAN 13*
			</label>
			<input
				type="text"
				id="codigoBarras"
				bind:value={codigoBarras}
				on:keydown={handleBarcodeInput}
				placeholder="Escanear o ingresar código"
				class="mt-1 block w-full rounded border p-2 focus:border-blue-500 focus:ring-blue-500"
			/>
		</div>
	{/if}

	<!-- Product Details -->
	{#if product}
		<div class="mb-6 rounded bg-white p-4 shadow">
			<h3 class="mb-2 text-lg font-semibold">Detalles del Producto</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<p><strong>Ubicación:</strong> {product.ubicacion}</p>
				<p><strong>Código:</strong> {product.codigo_barras}</p>
				<p><strong>Número de Parte:</strong> {product.numero_parte}</p>
				<p><strong>Descripción:</strong> {product.descripcion}</p>
				<p><strong>Inventario Sistema:</strong> {product.inventario_sistema}</p>
			</div>
		</div>

		<!-- Movement Details Form -->
		<div class="rounded bg-white p-6 shadow">
			<h3 class="mb-4 text-lg font-semibold">Registrar Movimiento</h3>

			<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Movement Type -->
				<div>
					<label for="tipoMovimiento" class="block text-sm font-medium text-gray-700"
						>Tipo de Movimiento *</label
					>
					<select
						id="tipoMovimiento"
						bind:value={tipoMovimiento}
						class="w-full rounded border p-2 focus:border-blue-500 focus:ring-blue-500"
					>
						<option value="">Seleccionar Tipo</option>
						{#each tiposMovimiento as tipo}
							<option value={tipo.value}>{tipo.label}</option>
						{/each}
					</select>
				</div>

				<!-- Quantity -->
				<div>
					<label for="cantidad" class="block text-sm font-medium text-gray-700">Cantidad *</label>
					<input
						type="number"
						id="cantidad"
						bind:value={cantidad}
						min="1"
						class="w-full rounded border p-2 focus:border-blue-500 focus:ring-blue-500"
					/>
				</div>
			</div>

			<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Document Number -->
				<div>
					<label for="numeroDocumento" class="block text-sm font-medium text-gray-700"
						>Número de Documento *</label
					>
					<input
						type="text"
						id="numeroDocumento"
						bind:value={numeroDocumento}
						placeholder="Factura, orden, etc."
						class="w-full rounded border p-2 focus:border-blue-500 focus:ring-blue-500"
					/>
				</div>
			</div>

			<!-- Comments -->
			<div class="mb-4">
				<label for="comentarios" class="block text-sm font-medium text-gray-700">Comentarios</label>
				<textarea
					id="comentarios"
					bind:value={comentarios}
					rows="3"
					placeholder="Comentarios adicionales"
					class="w-full rounded border p-2 focus:border-blue-500 focus:ring-blue-500"
				></textarea>
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-4">
				<button
					on:click={saveMovement}
					disabled={loading}
					class="rounded bg-green-500 px-6 py-2 text-white transition-colors hover:bg-green-600 disabled:bg-gray-400"
				>
					{loading ? 'Guardando...' : 'Guardar Movimiento'}
				</button>

				<button
					on:click={resetForm}
					class="rounded bg-gray-500 px-6 py-2 text-white transition-colors hover:bg-gray-600"
				>
					Limpiar Formulario
				</button>
			</div>
		</div>
	{/if}
</div>
