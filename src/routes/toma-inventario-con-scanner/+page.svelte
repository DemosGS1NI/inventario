<script>
    import { addToast } from '$lib/stores/toast';
    import { validateInventoryForm } from '$lib/utils/validation';
    import { onMount, tick } from 'svelte';
    import BackToMenuButton from '$lib/BackToMenu.svelte';
	  import { request } from 'pandas/lib/flickr';
  
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
    let barcodeInput;
    let stockQuantityInput;
  
    onMount(async () => {
      await fetchBodegas();
      await fetchCategoriasIncidencias();
    });
  
    async function handleBarcodeInput(event) {
      if (event.key === 'Enter' || event.key === 'Tab') {
         event.preventDefault(); // Prevent default form submission
        await fetchProductDetails();
      }
}

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

    async function saveChanges() {
        const formData = {
            bodega: selectedBodega,
            marca: selectedMarca,
            ubicacion,
            codigo_barras: codigoBarras,
            inventario_fisico: stockQuantity,
            categoria_incidencia: selectedCategoriaIncidencia,
            incidencia
        };

        const { isValid, errors } = validateInventoryForm(formData);

        if (!isValid) {
            // Show first error in toast
            const firstError = Object.values(errors)[0];
            addToast(firstError, 'error');
            return;
        }

        try {
            const res = await fetch('/api/producto', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                addToast(data.message || 'Error al guardar el producto', 'error');
                return;
            }

            addToast('Producto actualizado exitosamente!', 'success');
            resetFieldsAfterSave();
        } catch (error) {
            console.error('Error saving product:', error);
            addToast('Error inesperado al guardar el producto', 'error');
        }
    }


  
    async function fetchProductDetails() {
      if (!ubicacion || !codigoBarras) {
        addToast('Favor introduzca ubicación y código de barra del producto', 'error');
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
          await tick();
          requestAnimationFrame(() => { stockQuantityInput?.focus(); });
       } else {
          product = null;
          addToast(data.message || 'Producto no existe', 'error');
          codigoBarras = ''; // Clear barcode field
          await tick();
          barcodeInput?.focus(); // Focus the barcode field
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        addToast('Error inesperado al buscar el producto', 'error');
        codigoBarras = ''; // Clear barcode field
        await tick();
        barcodeInput?.focus(); // Focus the barcode field
      }
    }
  
    function resetFieldsAfterSave() {
      codigoBarras = '';
      product = null;
      stockQuantity = 0;
      incidencia = '';
      selectedCategoriaIncidencia = '';
      tick().then(() => barcodeInput?.focus()); // Focus the barcode field after resetting
    }
  
    function cancelChanges() {
      resetFieldsAfterSave();
    }

    function resetFieldsForNewLocation() {
      ubicacion = '';
      resetFieldsAfterSave();
    }

  </script>
  
  <div class="p-6 bg-gray-100 min-h-screen">
    <h1 class="text-2xl font-bold mb-4">Toma de Inventario</h1>
  
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

      {#if selectedBodega}
      <div>
        <label for="marca" class="block text-sm font-medium text-gray-700">Marca</label>
        <select id="marca" bind:value={selectedMarca} class="w-full border rounded p-2">
          <option value="">Seleccione Marca</option>
          {#each marcas as marca}
            <option value={marca}>{marca}</option>
          {/each}
        </select>
      </div>  
      {/if}

      {#if selectedBodega && selectedMarca}
      <div>
        <label for="ubicacion" class="block text-sm font-medium text-gray-700">Ubicación (Estante y Nivel)</label>
        <input
          type="text"
          id="ubicacion"
          bind:value={ubicacion}
          placeholder="Escanear Ubicacion"
          class="w-full border rounded p-2"
        />
      </div>
      {/if}

      {#if selectedBodega && selectedMarca && ubicacion}      

     <!-- Barcode Input -->
    <div class="mb-4">
      <label for="barcodeInput" class="block text-sm font-medium text-gray-700">Codigo de Barras del Producto</label>
      <input
        type="text"
        id="barcodeInput"
        bind:value={codigoBarras}
        bind:this={barcodeInput} 
        placeholder="Escanear el codigo de barras del producto"
        on:keydown={handleBarcodeInput}
        class="block w-full border rounded p-2"
      />
    </div>
    {/if}
  </div>

  <!-- Button for Selecting New Location -->
  <div class="flex space-x-4">
    {#if selectedBodega && selectedMarca &&  ubicacion && !codigoBarras}
     <button
        on:click={resetFieldsForNewLocation}
        class="mt-4 bg-red-500 text-white p-2 rounded">
        Seleccione otra Ubicación
      </button>
    {/if}
  </div>
  
  
    <!-- Product Details -->
    {#if product}
      <div class="mb-4">
        <p><strong>Numero Parte:</strong> {product.numero_parte}</p>
        <p><strong>Descripcion:</strong> {product.descripcion}</p>
        <p><strong>Fecha Inventario:</strong> {product.fecha_inventario}</p>
        <label for="stockQuantity" class="block text-sm font-medium text-gray-700 mt-2">Inventario Físico</label>
        <input id="stockQuantity" type="number" bind:value={stockQuantity} bind:this={stockQuantityInput} class="block w-full mt-1 p-2 border rounded" />
        <label for="categoriaIncidencia" class="block text-sm font-medium text-gray-700 mt-2">Categoría Incidencia</label>
        <select id="categoriaIncidencia" bind:value={selectedCategoriaIncidencia} class="block w-full mt-1 p-2 border rounded">
          <option value="">Seleccione una Categoria</option>
          {#each categoriasIncidencias as categoria}
            <option value={categoria}>{categoria}</option>
          {/each}
        </select>
        <label for="incidencia" class="block text-sm font-medium text-gray-700 mt-2">Notas</label>
        <textarea id="incidencia" bind:value={incidencia} class="block w-full mt-1 p-2 border rounded"></textarea>
        <div class="flex gap-4 mt-4">
          <button on:click={saveChanges} class="bg-green-500 text-white p-2 rounded">Guardar</button>
          <button on:click={cancelChanges} class="bg-gray-500 text-white p-2 rounded">Cancelar</button>
        </div>
      </div>
   {/if}
  </div>
  