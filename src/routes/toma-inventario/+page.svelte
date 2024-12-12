<script>
  import { onMount, tick } from 'svelte';
  import { BrowserMultiFormatReader } from '@zxing/browser';

  let bodegas = [];
  let marcas = [];
  let categoriasIncidencia = []; // To be fetched from the database
  let selectedBodega = '';
  let selectedMarca = '';
  let ubicacion = '';
  let codigoBarras = '';
  let product = null;
  let stockQuantity = 0;
  let incidencia = '';
  let categoriaIncidencia = ''; // This will reflect the database value
  let message = '';
  let scanner = null;
  let isScanning = false;
  let scanningType = ''; // 'ubicacion' or 'codigoBarra'
  let categoriaIncidencias = '';



  // Fetch bodegas on mount
  onMount(async () => {
    await fetchBodegas();
    await fetchCategoriasIncidencias();
  });

  // Fetch bodegas
  async function fetchBodegas() {
    try {
      const res = await fetch('/api/bodegas');
      const response = await res.json();
      bodegas = response.bodegas || [];
    } catch (error) {
      console.error('Error fetching bodegas:', error);
    }
  }

  // Fetch marcas based on selected bodega
  async function fetchMarcas() {
    if (!selectedBodega) return;

    try {
      const res = await fetch(`/api/marcas?bodega=${selectedBodega}`);
      const data = await res.json();
      marcas = data.marcas || [];
    } catch (error) {
      console.error('Error fetching marcas:', error);
    }
  }

    // Fetch categorias incidencias
    async function fetchCategoriasIncidencias() {
    try {
      const res = await fetch('/api/categorias-incidencias');
      const data = await res.json();

      console.log('Fetched categories:', data); // Log the response data

      if (res.ok) {
        categoriasIncidencia = data.map((item) => item.categoria); // Extract only category names
      } else {
        console.error('Error fetching categorias incidencias:', data.error);
      }
    } catch (error) {
      console.error('Error fetching categorias incidencias:', error);
    }
  }

  // Start scanner
  async function startScanner(type) {
    scanningType = type;
    isScanning = true;

    await tick(); // Ensure video element is rendered
    const videoElement = document.getElementById('scanner-video');
    if (!videoElement) {
      console.error('Scanner video element not found');
      return;
    }

    scanner = new BrowserMultiFormatReader();

    try {
      await scanner.decodeFromVideoDevice(null, videoElement, (result) => {
        if (result) {
          const scannedValue = result.getText();
          console.log(`Scanned ${type}:`, scannedValue);

          if (type === 'ubicacion') {
            ubicacion = scannedValue;
            stopScanner();
          } else if (type === 'codigoBarras') {
            codigoBarras = scannedValue;
            fetchProductDetails();
            stopScanner();
          }
        }
      });
    } catch (error) {
      console.error(`Error initializing scanner for ${type}:`, error);
      stopScanner();
    }
  }

  // Stop scanner
  function stopScanner() {
    isScanning = false;
    scanningType = '';

    if (scanner) {
      scanner.reset();
      scanner = null;
    }

    const videoElement = document.getElementById('scanner-video');
    if (videoElement && videoElement.srcObject) {
      const stream = videoElement.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoElement.srcObject = null;
    }
  }

 async function fetchProductDetails() {
  try {
    const res = await fetch(`/api/producto?bodega=${selectedBodega}&marca=${selectedMarca}&codigo_barras=${codigoBarras}`);

    if (!res.ok) {
      console.log(codigoBarras);
      throw new Error('Codigo de Barras del Producto no encontrado!');
    }

    const data = await res.json();

    if (data.product && data.product.length > 0) {
      product = data.product[0];
      stockQuantity = product.inventario_fisico || 0;
      incidencia = product.incidencia || '';
      categoriaIncidencia = product.categoria_incidencia || ''; // Set fetched value or empty
      message = ''; // Clear message
    } else {
      product = null;
      message = 'Producto no existe';
      codigoBarras = ''; // Reset codigoBarra for a new scan
      await tick(); // Wait for DOM updates
      startScanner('codigoBarras'); // Restart scanner for barcode
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    message = 'Producto no existe'; // Display error
    codigoBarras = ''; // Reset codigoBarra for a new scan
    await tick(); // Wait for DOM updates
    startScanner('codigoBarras'); // Restart scanner for barcode
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
        categoria_incidencia: categoriaIncidencia, // Include categoria incidencia in the payload        
        incidencia: incidencia,
        actualizado_por: 1,
      };

      console.log(payload);

      const res = await fetch('/api/producto', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Error saving product');
      alert('Product updated successfully!');
      resetFieldsAfterSave();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  }

  function resetFieldsAfterSave() {
    codigoBarras = '';
    product = null;
    stockQuantity = 0;
    incidencia = '';
    categoriaIncidencia = ''; // Reset category
    message = '';
  }

  function resetFieldsForNewLocation() {
    ubicacion = '';
    resetFieldsAfterSave();
  }

  function goToMainMenu() {
    window.location.href = '/'; // Replace with the actual main menu route
  }
</script>

<div class="p-6 bg-gray-100 min-h-screen">
  <h1 class="text-2xl font-bold mb-4">Toma de Inventario - Workflow 1</h1>

  <!-- Select Bodega -->
  <div class="mb-4">
    <label for="bodega" class="block text-sm font-medium text-gray-700">Select Bodega</label>
    <select id="bodega" bind:value={selectedBodega} on:change={fetchMarcas} class="block w-full mt-1 p-2 border rounded">
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
      <select id="marca" bind:value={selectedMarca} class="block w-full mt-1 p-2 border rounded">
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
        class="mt-4 bg-blue-500 text-white p-2 rounded">
        Scan Ubicación
      </button>
      <button
        on:click={goToMainMenu}
        class="mt-4 bg-gray-500 text-white p-2 rounded">
        Back to Main Menu
      </button>
    </div>
  {/if}

  <!-- Display Ubicación -->
  {#if ubicacion}
    <div class="mb-4">
      <label for="ubicacion" class="block text-sm font-medium text-gray-700">Ubicación</label>
      <input id="ubicacion" type="text" bind:value={ubicacion} readonly class="block w-full mt-1 p-2 border rounded" />
    </div>

    <!-- Buttons for Scanning or Selecting New Location -->
    <div class="flex space-x-4">
      {#if !codigoBarras && !isScanning}
        <button
          on:click={() => startScanner('codigoBarras')}
          class="mt-4 bg-green-500 text-white p-2 rounded">
          Scan Código de Barra
        </button>
        <button
          on:click={resetFieldsForNewLocation}
          class="mt-4 bg-red-500 text-white p-2 rounded">
          Seleccione otra Ubicación
        </button>
      {/if}
    </div>
  {/if}

  <!-- Display Código de Barra -->
  {#if codigoBarras}
    <div class="mb-4">
      <label for="codigoBarras" class="block text-sm font-medium text-gray-700">Código de Barra</label>
      <input id="codigoBarras" type="text" bind:value={codigoBarras} readonly class="block w-full mt-1 p-2 border rounded" />
    </div>
  {/if}

  <!-- Display Product -->
  {#if product}
    <div class="mb-4">
      <p><strong>Numero Parte:</strong> {product.numero_parte}</p>
      <p><strong>Descripcion:</strong> {product.descripcion}</p>
      <p><strong>Fecha Inventario:</strong> {product.fecha_inventario}</p>
      <label for="stock" class="block text-sm font-medium text-gray-700 mt-2">Inventario Físico</label>
      <input id="stock" type="number" bind:value={stockQuantity} class="block w-full mt-1 p-2 border rounded" />

      <!-- New Combo Box -->
      <label for="categoriaIncidencia" class="block text-sm font-medium text-gray-700 mt-2">
        Categoría Incidencia
      </label>
      <select
        id="categoriaIncidencia"
        bind:value={categoriaIncidencia}
        class="block w-full mt-1 p-2 border rounded"
      >
        <option value="">Select a category</option>
        {#each categoriasIncidencia as categoria}
          <option value={categoria}>{categoria}</option>
        {/each}
      </select>

      <label for="incidencia" class="block text-sm font-medium text-gray-700 mt-2">Incidencia</label>
      <textarea id="incidencia" bind:value={incidencia} class="block w-full mt-1 p-2 border rounded"></textarea>
      <button on:click={saveChanges} class="mt-4 bg-green-500 text-white p-2 rounded">Save Changes</button>
    </div>
  {:else if message}
    <p class="text-red-500 mt-4">{message}</p>
  {/if}

  <!-- Scanner Video -->
  {#if isScanning}
    <div class="mt-4">
      <video id="scanner-video" class="w-full border rounded" autoplay muted playsinline></video>
    </div>
  {/if}
</div>
