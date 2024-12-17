<script>
    import { onMount, tick } from 'svelte';
    import Quagga from 'quagga';
    import BackToMenuButton from '$lib/BackToMenu.svelte';
    
  
    let bodegas = [];
    let marcas = [];
    let selectedBodega = '';
    let selectedMarca = '';
    let ubicacion = '';
    let codigoBarras = '';
    let product = null;
    let stockQuantity = 0;
    let message = '';
    let isScanning = false;
    let scanningType = '';
  
    // Fetch bodegas and brands
    onMount(async () => {
      await fetchBodegas();
    });
  
    async function fetchBodegas() {
      const res = await fetch('/api/bodegas');
      bodegas = (await res.json()).bodegas || [];
    }
  
    async function fetchMarcas() {
      if (!selectedBodega) return;
      const res = await fetch(`/api/marcas?bodega=${selectedBodega}`);
      marcas = (await res.json()).marcas || [];
    }
  
    async function fetchProductDetails() {
      try {
        const res = await fetch(`/api/producto?bodega=${selectedBodega}&marca=${selectedMarca}&codigo_barras=${codigoBarras}`);
        const data = await res.json();
  
        if (data.product) {
          product = data.product[0];
          stockQuantity = product.inventario_fisico || 0;
          message = '';
        } else {
          message = 'Producto no existe';
          resetScanning();
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        message = 'Error fetching product.';
        resetScanning();
      }
    }
  
    // Start Quagga Scanner

    async function startScanner(type) {
  scanningType = type;
  isScanning = true;

  await tick(); // Ensure the DOM is updated

  const videoElement = document.querySelector('#scanner-video');

  if (!videoElement) {
    console.error('Scanner video element not found.');
    return;
  }

  try {
    // Request the video stream with torch support
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        advanced: [{ torch: true }], // Attempt to turn on the torch
      },
    });

    const [track] = stream.getVideoTracks(); // Get the active video track
    const capabilities = track.getCapabilities();

    // Check if the device supports torch
    if (capabilities.torch) {
      track.applyConstraints({
        advanced: [{ torch: true }],
      });
      console.log('Torch activated.');
    } else {
      console.warn('Torch is not supported on this device.');
    }

    // Attach the video stream to the video element
    videoElement.srcObject = stream;
    videoElement.play();

    // Initialize QuaggaJS
    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: videoElement, // Video element
        },
        decoder: {
          readers: ['code_128_reader'], // Code 128 scanner
        },
      },
      (err) => {
        if (err) {
          console.error('QuaggaJS Initialization Error:', err);
          stopScanner();
          return;
        }
        console.log('QuaggaJS initialized');
        Quagga.start();
      }
    );

    // Handle barcode detection
    Quagga.onDetected((data) => {
      console.log('Scanned Result:', data.codeResult.code);

      if (scanningType === 'ubicacion') {
        ubicacion = data.codeResult.code;
      } else if (scanningType === 'codigoBarras') {
        codigoBarras = data.codeResult.code;
        fetchProductDetails();
      }

      stopScanner();
    });

  } catch (error) {
    console.error('Error starting scanner:', error);
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
    tracks.forEach((track) => track.stop()); // Stop all video tracks
    videoElement.srcObject = null;
  }
}


    function resetScanning() {
      ubicacion = '';
      codigoBarras = '';
      product = null;
      stockQuantity = 0;
      message = '';
    }
  </script>
  
  <!-- Page Layout -->
  <div class="p-6 bg-gray-100 min-h-screen">
    <h1 class="text-2xl font-bold mb-4">Toma de Inventario</h1>
    <BackToMenuButton />
  
    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div>
        <label class="block text-sm font-medium">Bodega</label>
        <select bind:value={selectedBodega} on:change={fetchMarcas} class="w-full p-2 border rounded">
          <option value="">Seleccione una bodega</option>
          {#each bodegas as bodega}
            <option value={bodega}>{bodega}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium">Marca</label>
        <select bind:value={selectedMarca} class="w-full p-2 border rounded">
          <option value="">Seleccione una marca</option>
          {#each marcas as marca}
            <option value={marca}>{marca}</option>
          {/each}
        </select>
      </div>
    </div>
  
    <!-- Scan Location -->
    {#if selectedBodega && selectedMarca && !ubicacion}
      <button on:click={() => startScanner('ubicacion')} class="bg-blue-500 text-white p-2 rounded">
        Escanear Ubicación
      </button>
    {/if}
  
    {#if ubicacion}
      <p class="mt-4"><strong>Ubicación:</strong> {ubicacion}</p>
      <button on:click={() => startScanner('codigoBarras')} class="bg-green-500 text-white p-2 rounded">
        Escanear Código de Barras
      </button>
    {/if}
  
    <!-- Display Product -->
    {#if codigoBarras}
      <p class="mt-4"><strong>Código de Barras:</strong> {codigoBarras}</p>
    {/if}
  
    {#if product}
      <div class="mt-4 p-4 bg-white rounded shadow">
        <p><strong>Número de Parte:</strong> {product.numero_parte}</p>
        <p><strong>Descripción:</strong> {product.descripcion}</p>
        <p><strong>Stock Actual:</strong> {stockQuantity}</p>
      </div>
    {/if}
  
    <!-- Scanner Video -->
    {#if isScanning}
      <div class="mt-4">
        <video id="scanner-video" class="w-full border rounded"></video>
      </div>
    {/if}
  
    {#if message}
      <p class="text-red-500 mt-4">{message}</p>
    {/if}
  </div>
  