<script>
	import { onMount, tick, onDestroy } from 'svelte';
	import Quagga from '@ericblade/quagga2';
	import BackToMenuButton from '$lib/BackToMenu.svelte';
	import { addToast } from '$lib/stores/toast'; // ADD THIS IMPORT

	let bodegas = [];
	let marcas = [];
	let categoriasIncidencias = [];
	let selectedBodega = '';
	let selectedMarca = '';
	let ubicacion = '';
	let codigoBarras = '';
	let product = null;
	let stockQuantity = 0;
	let incidencia = '';
	let selectedCategoriaIncidencia = '';
	let message = '';
	let scanner = null;
	let isScanning = false;
	let scanningType = '';
	let beep;

	// Fetch bodegas and categorias incidencias on mount
	onMount(async () => {
		beep = new Audio('store-scanner-beep-90395.mp3');
		await fetchBodegas();
		await fetchCategoriasIncidencias();
	});

	onDestroy(() => {
		if (isScanning) {
			stopScanner();
		}

		if (beep) {
			beep = null;
		}
	});

	async function fetchBodegas() {
		try {
			const res = await fetch('/api/bodegas');
			const data = await res.json();

			if (res.ok && data.status === 'success') {
				bodegas = data.data;
				console.log('Bodegas fetched:', bodegas);
			} else {
				addToast('Error al cargar bodegas: ' + (data.message || 'Error desconocido'), 'error');
			}
		} catch (error) {
			addToast('Error al cargar bodegas: ' + error.message, 'error');
		}
	}

	// Fetch marcas based on selected bodega
	async function fetchMarcas() {
		if (!selectedBodega) {
			addToast('Error: No hay bodega seleccionada.', 'error');
			return;
		}

		try {
			const res = await fetch(`/api/marcas?bodega=${encodeURIComponent(selectedBodega)}`);
			const data = await res.json();

			if (res.ok && data.status === 'success') {
				marcas = data.data;
				console.log('Marcas fetched:', marcas);
			} else {
				addToast('Error al cargar marcas: ' + (data.message || 'Error desconocido'), 'error');
				message = 'Error fetching marcas. Please try again.';
			}
		} catch (error) {
			addToast('Error al cargar marcas: ' + error.message, 'error');
			message = 'An unexpected error occurred while fetching marcas.';
		}
	}

	async function fetchCategoriasIncidencias() {
		try {
			const res = await fetch('/api/db/categorias-incidencias');
			const data = await res.json();

			console.log('Fetched categories:', data);

			if (res.ok && data.status === 'success' && Array.isArray(data.data)) {
				categoriasIncidencias = data.data.map((item) => item.categoria);
			} else {
				addToast(
					'Error al cargar categorías: ' + (data.message || 'Estructura de respuesta inválida'),
					'error'
				);
			}
		} catch (error) {
			addToast('Error al cargar categorías: ' + error.message, 'error');
		}
	}

	// Start scanner
	async function startScanner(type) {
		scanningType = type;
		isScanning = true;

		await tick();

		const videoElement = document.querySelector('#scanner-video');

		if (!videoElement) {
			addToast('Error: Elemento de video del scanner no encontrado.', 'error');
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'environment',
					advanced: [{ torch: true }]
				}
			});

			const [track] = stream.getVideoTracks();
			const capabilities = track.getCapabilities();

			if (capabilities.torch) {
				track.applyConstraints({
					advanced: [{ torch: true }]
				});
				console.log('Torch activated.');
			} else {
				console.warn('Torch is not supported on this device.');
			}

			videoElement.srcObject = stream;
			videoElement.play();

			Quagga.init(
				{
					inputStream: {
						type: 'LiveStream',
						target: videoElement
					},
					decoder: {
						readers: ['code_128_reader']
					}
				},
				(err) => {
					if (err) {
						console.error('QuaggaJS Initialization Error:', err);
						addToast('Error al inicializar el scanner: ' + err.message, 'error');
						stopScanner();
						return;
					}
					console.log('QuaggaJS initialized');
					Quagga.start();
				}
			);

			Quagga.onDetected((data) => {
				if (beep) beep.play();
				console.log('Scanned Result:', data.codeResult.code);

				if (scanningType === 'ubicacion') {
					ubicacion = data.codeResult.code;
					addToast('Ubicación escaneada: ' + ubicacion, 'success');
				} else if (scanningType === 'codigoBarras') {
					codigoBarras = data.codeResult.code;
					console.log(codigoBarras);
					fetchProductDetails();
				}

				stopScanner();
			});
		} catch (error) {
			console.error('Error starting scanner:', error);
			addToast('Error al iniciar el scanner: ' + error.message, 'error');
			stopScanner();
		}
	}

	function stopScanner() {
		Quagga.stop();
		isScanning = false;
		scanningType = '';

		const videoElement = document.querySelector('#scanner-video');
		if (videoElement?.srcObject) {
			const tracks = videoElement.srcObject.getTracks();
			tracks.forEach((track) => track.stop());
			videoElement.srcObject = null;
		}
	}

	async function fetchProductDetails() {
		try {
			const res = await fetch(
				`/api/producto?bodega=${selectedBodega}&marca=${selectedMarca}&codigo_barras=${codigoBarras}`
			);

			const data = await res.json();

			if (res.ok && data.data && data.data.length > 0) {
				product = data.data[0];
				stockQuantity = product.inventario_fisico || 0;
				incidencia = product.incidencia || '';
				selectedCategoriaIncidencia = product.categoria_incidencia || '';
				message = '';
				addToast('Producto encontrado: ' + product.numero_parte, 'success');
			} else {
				product = null;
				message = data.message || 'Producto no existe';
				addToast(message, 'error');
				codigoBarras = '';
				await tick();
				startScanner('codigoBarras');
			}
		} catch (error) {
			addToast('Error al buscar producto: ' + error.message, 'error');
			message = 'Producto no existe';
			codigoBarras = '';
			await tick();
			startScanner('codigoBarras');
		}
	}

	// Save changes
	async function saveChanges() {
		try {
			const payload = {
				bodega: selectedBodega,
				ubicacion: ubicacion,
				marca: selectedMarca,
				codigo_barras: codigoBarras,
				inventario_fisico: stockQuantity,
				categoria_incidencia: selectedCategoriaIncidencia,
				incidencia: incidencia
			};

			console.log('Payload being sent:', payload);

			const res = await fetch('/api/producto', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const responseData = await res.json();

			if (!res.ok) {
				console.error('Error response from server:', responseData);
				// Handle different error response formats
				let errorMessage = 'Error al guardar producto';
				if (responseData.error) {
					if (typeof responseData.error === 'string') {
						errorMessage = responseData.error;
					} else if (typeof responseData.error === 'object' && responseData.error.message) {
						errorMessage = responseData.error.message;
					}
				} else if (responseData.message) {
					errorMessage = responseData.message;
				}
				addToast(errorMessage, 'error');
				return;
			}

			console.log('Server response:', responseData);
			addToast('Producto actualizado exitosamente!', 'success');
			resetFieldsAfterSave();
		} catch (error) {
			console.error('Unexpected error while saving product:', error);
			addToast('Error inesperado al guardar producto: ' + error.message, 'error');
		}
	}

	function resetFieldsAfterSave() {
		codigoBarras = '';
		product = null;
		stockQuantity = 0;
		incidencia = '';
		selectedCategoriaIncidencia = '';
		message = '';
	}

	function resetFieldsForNewLocation() {
		ubicacion = '';
		resetFieldsAfterSave();
	}
</script>

<div class="min-h-screen bg-gray-100 p-6">
	<h1 class="mb-4 text-2xl font-bold">Toma de Inventario - Codigo Interno</h1>

	<div>
		<BackToMenuButton />
	</div>

	<!-- Select Bodega -->
	<div class="mb-4">
		<label for="bodega" class="block text-sm font-medium text-gray-700">Select Bodega</label>
		<select
			id="bodega"
			bind:value={selectedBodega}
			on:change={fetchMarcas}
			class="mt-1 block w-full rounded border p-2"
		>
			<option value="">Select a Bodega</option>
			{#each bodegas as bodega}
				<option value={bodega}>{bodega}</option>
			{/each}
		</select>
	</div>

	<!-- Select Marca -->
	{#if selectedBodega}
		<div class="mb-4">
			<label for="marca" class="block text-sm font-medium text-gray-700">Select Marca</label>
			<select id="marca" bind:value={selectedMarca} class="mt-1 block w-full rounded border p-2">
				<option value="">Select a Marca</option>
				{#each marcas as marca}
					<option value={marca}>{marca}</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- Scan Ubicación -->
	{#if selectedBodega && selectedMarca && !isScanning && !ubicacion}
		<div class="flex space-x-4">
			<button
				on:click={() => startScanner('ubicacion')}
				class="mt-4 rounded bg-blue-500 p-2 text-white"
			>
				Scan Ubicación
			</button>
		</div>
	{/if}

	<!-- Display Ubicación -->
	{#if ubicacion}
		<div class="mb-4">
			<label for="ubicacion" class="block text-sm font-medium text-gray-700">Ubicación</label>
			<input
				id="ubicacion"
				type="text"
				bind:value={ubicacion}
				readonly
				class="mt-1 block w-full rounded border p-2"
			/>
		</div>

		<!-- Buttons for Scanning or Selecting New Location -->
		<div class="flex space-x-4">
			{#if !codigoBarras && !isScanning}
				<button
					on:click={() => startScanner('codigoBarras')}
					class="mt-4 rounded bg-green-500 p-2 text-white"
				>
					Scan Código de Barra
				</button>
				<button on:click={resetFieldsForNewLocation} class="mt-4 rounded bg-red-500 p-2 text-white">
					Seleccione otra Ubicación
				</button>
			{/if}
		</div>
	{/if}

	<!-- Display Código de Barra -->
	{#if codigoBarras}
		<div class="mb-4">
			<label for="codigoBarras" class="block text-sm font-medium text-gray-700"
				>Código de Barra</label
			>
			<input
				id="codigoBarras"
				type="text"
				bind:value={codigoBarras}
				readonly
				class="mt-1 block w-full rounded border p-2"
			/>
		</div>
	{/if}

	<!-- Display Product -->
	{#if product}
		<div class="mb-4">
			<p><strong>Numero Parte:</strong> {product.numero_parte}</p>
			<p><strong>Descripcion:</strong> {product.descripcion}</p>
			<p><strong>Fecha Inventario:</strong> {product.fecha_inventario}</p>
			<label for="stock" class="mt-2 block text-sm font-medium text-gray-700"
				>Inventario Físico</label
			>
			<input
				id="stock"
				type="number"
				bind:value={stockQuantity}
				class="mt-1 block w-full rounded border p-2"
			/>

			<!-- New Combo Box -->
			<label for="categoriaIncidencia" class="mt-2 block text-sm font-medium text-gray-700">
				Categoría Incidencia
			</label>
			<select
				id="categoriaIncidencia"
				bind:value={selectedCategoriaIncidencia}
				class="mt-1 block w-full rounded border p-2"
			>
				<option value="">Select a category</option>
				{#each categoriasIncidencias as categoria}
					<option value={categoria}>{categoria}</option>
				{/each}
			</select>

			<label for="incidencia" class="mt-2 block text-sm font-medium text-gray-700">Incidencia</label
			>
			<textarea id="incidencia" bind:value={incidencia} class="mt-1 block w-full rounded border p-2"
			></textarea>
			<button on:click={saveChanges} class="mt-4 rounded bg-green-500 p-2 text-white"
				>Save Changes</button
			>
		</div>
	{:else if message}
		<p class="mt-4 text-red-500">{message}</p>
	{/if}

	<!-- Scanner Video -->
	{#if isScanning}
		<div class="mt-4">
			<video id="scanner-video" class="w-full rounded border" autoplay muted playsinline></video>
		</div>
	{/if}
</div>
