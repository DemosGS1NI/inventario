<script>
    import { onMount, tick } from 'svelte';
    import BackToMenuButton from '$lib/BackToMenu.svelte';
  
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
    let barcodeInput;
  
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
  
    async function fetchProductDetails() {
      if (!ubicacion || !codigoBarras) {
        message = 'Please enter both location and product barcode.';
        return;
      }
  
      try {
        const res = await fetch(
          `/api/producto?bodega=${selectedBodega}&marca=${selectedMarca}&ubicacion=${ubicacion}&codigo_barras=${codigoBarras}`
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
          codigoBarras = ''; // Clear barcode field
          await tick();
          barcodeInput?.focus(); // Focus the barcode field
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        message = 'An unexpected error occurred.';
        codigoBarras = ''; // Clear barcode field
        await tick();
        barcodeInput?.focus(); // Focus the barcode field
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
          const data = await res.json();
          console.error('Error saving product:', data);
          alert(`Error saving product: ${data.message || 'Unknown error'}`);
          return;
        }
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
      selectedCategoriaIncidencia = '';
      message = '';
      tick().then(() => barcodeInput?.focus()); // Focus the barcode field after resetting
    }
  
    function cancelChanges() {
      resetFieldsAfterSave();
    }
  </script>
  
  <div class="p-6 bg-gray-100 min-h-screen">
    <h1 class="text-2xl font-bold mb-4">Toma de Inventario - Zebra Scanner</h1>
  
    <div>
      <BackToMenuButton />
    </div>
  
    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div>
        <label for="bodega" class="block text-sm font-medium text-gray-700">Bodega</label>
        <select id="bodega" bind:value={selectedBodega} on:change={fetchMarcas} class="w-full border rounded p-2">
          <option value="">Seleccione Bodega</option>
          {#each bodegas as bodega}
            <option value={bodega}>{bodega}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="marca" class="block text-sm font-medium text-gray-700">Marca</label>
        <select id="marca" bind:value={selectedMarca} class="w-full border rounded p-2">
          <option value="">Seleccione Marca</option>
          {#each marcas as marca}
            <option value={marca}>{marca}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="ubicacion" class="block text-sm font-medium text-gray-700">Ubicación</label>
        <input
          type="text"
          id="ubicacion"
          bind:value={ubicacion}
          placeholder="Escanear Ubicacion"
          class="w-full border rounded p-2"
        />
      </div>
    </div>
  
    <!-- Barcode Input -->
    <div class="mb-4">
      <label for="barcodeInput" class="block text-sm font-medium text-gray-700">Codigo de Barras del Producto</label>
      <input
        type="text"
        id="barcodeInput"
        bind:value={codigoBarras}
        bind:this={barcodeInput} 
        placeholder="Escanear el codigo de barras del producto"
        on:blur={fetchProductDetails}
        class="block w-full border rounded p-2"
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
        <div class="flex gap-4 mt-4">
          <button on:click={saveChanges} class="bg-green-500 text-white p-2 rounded">Save Changes</button>
          <button on:click={cancelChanges} class="bg-gray-500 text-white p-2 rounded">Cancel</button>
        </div>
      </div>
    {:else if message}
      <p class="text-red-500 mt-4">{message}</p>
    {/if}
  </div>
  