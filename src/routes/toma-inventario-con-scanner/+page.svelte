<script>
  import { onMount } from 'svelte';
  import BackToMenuButton from '$lib/BackToMenu.svelte';

  // Data variables
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

  // Fetch bodegas and categorias incidencias on mount
  onMount(async () => {
    await fetchBodegas();
    await fetchCategoriasIncidencias();
  });

  async function fetchBodegas() {
    try {
      const res = await fetch('/api/bodegas');
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        bodegas = data.data;
      } else {
        console.error('Error fetching bodegas:', data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching bodegas:', error);
    }
  }

  async function fetchMarcas() {
    if (!selectedBodega) return;
    try {
      const res = await fetch(`/api/marcas?bodega=${encodeURIComponent(selectedBodega)}`);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        marcas = data.data;
      } else {
        console.error('Error fetching marcas:', data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching marcas:', error);
    }
  }

  async function fetchCategoriasIncidencias() {
    try {
      const res = await fetch('/api/db/categorias-incidencias');
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        categoriasIncidencias = data.data.map((item) => item.categoria);
      } else {
        console.error('Error fetching categorias incidencias:', data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching categorias incidencias:', error);
    }
  }

  async function fetchProductDetails(barcode) {
    try {
      const res = await fetch(
        `/api/producto?bodega=${selectedBodega}&marca=${selectedMarca}&codigo_barras=${barcode}`
      );
      const data = await res.json();
      if (res.ok && data.data && data.data.length > 0) {
        product = data.data[0];
        stockQuantity = product.inventario_fisico || 0;
        incidencia = product.incidencia || '';
        selectedCategoriaIncidencia = product.categoria_incidencia || '';
        message = '';
      } else {
        product = null;
        message = data.message || 'Producto no existe';
        console.error(message);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  }

  function handleBarcodeInput(event) {
    codigoBarras = event.target.value.trim();
    if (codigoBarras) {
      fetchProductDetails(codigoBarras);
      event.target.value = ''; // Clear input for next scan
    }
  }

  async function saveChanges() {
    try {
      const payload = {
        bodega: selectedBodega,
        ubicacion: ubicacion,
        marca: selectedMarca,
        codigo_barras: codigoBarras,
        inventario_fisico: stockQuantity,
        categoria_incidencia: selectedCategoriaIncidencia,
        incidencia: incidencia,
      };

      const res = await fetch('/api/producto', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error('Error saving product:', await res.json());
        return;
      }
      alert('Product updated successfully!');
    } catch (error) {
      console.error('Error saving product:', error);
    }
  }

  function resetFields() {
    codigoBarras = '';
    product = null;
    stockQuantity = 0;
    incidencia = '';
    selectedCategoriaIncidencia = '';
  }
</script>

<div class="p-6 bg-gray-100 min-h-screen">
  <h1 class="text-2xl font-bold mb-4">Toma de Inventario - Zebra Scanner</h1>

  <div>
    <BackToMenuButton />
  </div>

  <!-- Filters -->
  <div class="mb-4">
    <label for="bodega" class="block text-sm font-medium text-gray-700">Select Bodega</label>
    <select id="bodega" bind:value={selectedBodega} on:change={fetchMarcas} class="block w-full mt-1 p-2 border rounded">
      <option value="">Select a Bodega</option>
      {#each bodegas as bodega}
        <option value={bodega}>{bodega}</option>
      {/each}
    </select>
  </div>

  <div class="mb-4">
    <label for="marca" class="block text-sm font-medium text-gray-700">Select Marca</label>
    <select id="marca" bind:value={selectedMarca} class="block w-full mt-1 p-2 border rounded">
      <option value="">Select a Marca</option>
      {#each marcas as marca}
        <option value={marca}>{marca}</option>
      {/each}
    </select>
  </div>

  <!-- Barcode Input -->
  <div class="mb-4">
    <label for="barcodeInput" class="block text-sm font-medium text-gray-700">Scan Barcode</label>
    <input
      type="text"
      id="barcodeInput"
      placeholder="Scan barcode here"
      on:input={handleBarcodeInput}
      class="block w-full mt-1 p-2 border rounded"
    />
  </div>

  <!-- Product Details -->
  {#if product}
    <div class="mb-4">
      <p><strong>Numero Parte:</strong> {product.numero_parte}</p>
      <p><strong>Descripcion:</strong> {product.descripcion}</p>
      <p><strong>Fecha Inventario:</strong> {product.fecha_inventario}</p>
      <label for="stockQuantity" class="block text-sm font-medium text-gray-700 mt-2">Inventario Físico</label>
      <input id="stockQuantity" type="number" bind:value={stockQuantity} class="block w-full mt-1 p-2 border rounded" />
      <label for="categoriaIncidencia" class="block text-sm font-medium text-gray-700 mt-2">Categoría Incidencia</label>
      <select id="categoriaIncidencia" bind:value={selectedCategoriaIncidencia} class="block w-full mt-1 p-2 border rounded">
        <option value="">Select a category</option>
        {#each categoriasIncidencias as categoria}
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
</div>
