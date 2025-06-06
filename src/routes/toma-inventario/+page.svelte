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
  
// Remove the complex store subscription block and replace with simple reactive declarations
$: selectedMarca = $inventoryStore.selectedMarca;
$: ubicacion = $inventoryStore.ubicacion;

// Add debug logging to track store changes
// $: {
//     console.log('Store state changed:', {
//         ubicacion: $inventoryStore.ubicacion,
//         selectedMarca: $inventoryStore.selectedMarca,
//         selectedBodega: $inventoryStore.selectedBodega
//     });
// }
  
    // Store-synced variables
    let bodegas = [];
    let marcas = [];
    let categoriasIncidencias = [];
    let loading = false;
    let error = null;
    let selectedBodega = '';
    let selectedMarca = '';
    let ubicacion = '';
    let currentProduct = null;
    
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
            // Fetch initial data
            const [bodegasResult, categoriasResult] = await Promise.all([
                inventoryAPI.fetchBodegas(),
                inventoryAPI.fetchCategoriasIncidencias()
            ]);

            // Check for specific errors and handle them
            if (bodegasResult.status !== 'success') {
                throw new Error('Error loading bodegas: ' + bodegasResult.message);
            }
            if (categoriasResult.status !== 'success') {
                throw new Error('Error loading categorias: ' + categoriasResult.message);
            }

        } catch (error) {
            console.error('Error in onMount:', error);
            addToast(error.message || 'Error loading initial data', 'error');
        }
    });
  
    onDestroy(() => {
        inventoryStore.reset();

        // Clear any pending form data
        codigoBarras = '';
        stockQuantity = 0;
        incidencia = '';
        selectedCategoriaIncidencia = '';
    });
  
    async function handleBodegaChange(event) {
        const bodega = event.target.value;
        inventoryStore.setSelectedBodega(bodega);
        // Reset dependent fields when warehouse changes
        inventoryStore.setUbicacion('');
        inventoryStore.setSelectedMarca('');
        resetFields();

        // Fetch brands for the selected warehouse
        if (bodega) {
            try {
                await inventoryAPI.fetchMarcas(bodega);
            } catch (error) {
                addToast('Error loading marcas', 'error');
            }
        }
    }
    

    async function handleUbicacionChange(event) {
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            const locationValue = event.target.value.trim();
            
            if (!locationValue) {
                return;
            }

            try {
                // Debug log before update
                console.log('Before update:', {
                    selectedBodega,
                    ubicacion: locationValue,
                    marcasLength: marcas.length
                });

                // Update location in store and wait for the update
                inventoryStore.setUbicacion(locationValue);
                await tick(); // Wait for store update

                // Debug log after first tick
                console.log('After store update:', {
                    selectedBodega,
                    ubicacion: $inventoryStore.ubicacion,
                    marcasLength: marcas.length
                });
                
                // Only proceed if we have both location and warehouse
                if (selectedBodega) {
                    await tick(); // Wait for DOM update
                    
                    // Debug log after DOM update
                    console.log('After DOM update:', {
                        selectedBodega,
                        ubicacion: $inventoryStore.ubicacion,
                        marcasLength: marcas.length,
                        marcaSelectExists: !!document.getElementById('marca')
                    });

                    const marcaSelect = document.getElementById('marca');
                    if (marcaSelect) {
                        marcaSelect.focus();
                    }
                }
            } catch (error) {
                console.error('Error in handleUbicacionChange:', error);
                addToast('Error actualizando ubicacion', 'error');
                event.target.focus();
            }
        }
    }
  
  // Modify handleMarcaChange to only reset product-specific fields
async function handleMarcaChange(event) {
    const marca = event.target.value;
    
    try {
        // console.log('Before marca change:', {
        //     ubicacion: $inventoryStore.ubicacion,
        //     selectedMarca: marca
        // });

        // Update marca in store
        inventoryStore.setSelectedMarca(marca);
        
        // Only reset product-related variables
        codigoBarras = '';
        stockQuantity = 0;
        incidencia = '';
        selectedCategoriaIncidencia = '';
        
        if (currentProduct) {
            currentProduct.single_item_ean13 = '';
            currentProduct.master_carton_ean13 = '';
        }

        await tick();
        
        // console.log('After marca change:', {
        //     ubicacion: $inventoryStore.ubicacion,
        //     selectedMarca: $inventoryStore.selectedMarca
        // });

        // Focus the barcode input
        if (barcodeInput) {
            barcodeInput.focus();
        }
    } catch (error) {
        console.error('Error in handleMarcaChange:', error);
        addToast('Error al seleccionar marca', 'error');
    }
} 

async function handleBarcodeInput(event) {
    if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        if (!ubicacion) {
            addToast('Favor introduzca ubicación', 'error');
            return;
        }

        try {
            const data = await inventoryAPI.fetchProductDetails(
                selectedBodega,
                selectedMarca,
                codigoBarras
            );


            if (data.status === 'success' ) {
                const product = data.data[0];
                stockQuantity = product.inventario_fisico ;
                incidencia = product.incidencia ;
                selectedCategoriaIncidencia = product.categoria_incidencia;
                await tick();
                stockQuantityInput?.focus();
            } else {
                addToast('Producto no existe', 'error');
                // Just clear the barcode input and keep focus on it
                codigoBarras = '';
                await tick();
                barcodeInput?.focus();
            }
        } catch (error) {
            addToast('Error inesperado al buscar el producto', 'error');
            // Just clear the barcode input and keep focus on it
            codigoBarras = '';
            await tick();
            barcodeInput?.focus();
        }
    }
}

    async function saveChanges() {

        const formData = {
            id: $inventoryStore.currentProduct.id,
            inventario_fisico: stockQuantity,
            categoria_incidencia: selectedCategoriaIncidencia,
            incidencia,
            single_item_ean13: currentProduct.single_item_ean13,
            master_carton_ean13: currentProduct.master_carton_ean13
        };

 
        try {
            const result = await inventoryAPI.saveProduct(formData);
            
            if (result.status === 'success') {
                addToast('Producto actualizado exitosamente!', 'success');
                resetFields();
            } else if (result.error?.code === 'NOT_FOUND') {
                addToast('Producto no encontrado o no se realizaron cambios', 'warning');
            } else {
                addToast(result.error?.message || 'Error al guardar el producto', 'error');
            }
        } catch (error) {
            addToast('Error de conexión al guardar el producto', 'error');
        }
    }
  
    function resetProductFields() {
        codigoBarras = '';
        stockQuantity = 0;
        incidencia = '';
        selectedCategoriaIncidencia = '';
        if (currentProduct) {
            currentProduct.single_item_ean13 = '';
            currentProduct.master_carton_ean13 = '';
        }
        inventoryStore.resetProduct();
        
    }

    function resetFields() {
        // Reset store values
       
        inventoryStore.setSelectedMarca('');
        resetProductFields();

        // Focus on marca select after reset
        tick().then(() => {
        const marcaSelect = document.getElementById('marca');
        if (marcaSelect) {
            marcaSelect.focus();
        }
        });
    }
  
    function resetBrand() {
        inventoryStore.setSelectedMarca('');
        resetProductFields();
            // Focus on marca select
    tick().then(() => {
        const marcaSelect = document.getElementById('marca');
        if (marcaSelect) {
            marcaSelect.focus();
        }
    });
    }
</script>

<div class="p-6 bg-gray-100 min-h-screen">
    <h1 class="text-2xl font-bold mb-4">Toma de Inventario</h1>

    <div>
        <BackToMenuButton />
    </div>

    {#if error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong class="font-bold">Error!</strong>
            <span class="block sm:inline">{error}</span>
        </div>
    {/if}

    <!-- Reorganized form flow -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <!-- Step 1: Select Warehouse -->
        <div>
            <label for="bodega" class="block text-sm font-medium text-gray-700">1. Seleccione Bodega</label>
            <select 
                id="bodega" 
                value={selectedBodega} 
                on:change={handleBodegaChange}
                class="w-full border rounded p-2"
            >
                <option value="">Seleccione Bodega</option>
                {#each bodegas as bodega}
                    <option value={bodega}>{bodega}</option>
                {/each}
            </select>
        </div>

        <!-- Step 2: Enter Location (only if warehouse is selected) -->
        {#if selectedBodega}
            <div>
                <label for="ubicacion" class="block text-sm font-medium text-gray-700">
                    2. Ubicación (Estante y Nivel)
                </label>
                <input
                    type="text"
                    id="ubicacion"
                    value={$inventoryStore.ubicacion}
                    on:input={(e) => inventoryStore.setUbicacion(e.target.value)}
                    on:keydown={handleUbicacionChange}
                    placeholder="Escanear Ubicacion"
                    class="w-full border rounded p-2"
                />
            </div>
        {/if}

        <!-- Step 3: Select Brand (only if location is entered) -->
        <!-- Debug display -->

        {#if selectedBodega && $inventoryStore.ubicacion}
            <div>
                <label for="marca" class="block text-sm font-medium text-gray-700">3. Seleccione Marca</label>
                <select 
                    id="marca" 
                    value={$inventoryStore.selectedMarca}
                    on:change={handleMarcaChange}
                    class="w-full border rounded p-2"
                >
                    <option value="">Seleccione Marca ({marcas.length} marcas disponibles)</option>
                    {#each marcas as marca}
                        <option value={marca}>{marca}</option>
                    {/each}
                </select>
            </div>
        {/if}

        {#if selectedBodega && $inventoryStore.ubicacion && !selectedMarca}
    <div>
        <button
            on:click={() => {
                inventoryStore.setUbicacion('');
                inventoryStore.setSelectedMarca('');
                resetProductFields();
                // Focus back on ubicacion input
                tick().then(() => {
                    const ubicacionInput = document.getElementById('ubicacion');
                    if (ubicacionInput) {
                        ubicacionInput.focus();
                    }
                });
            }}
            class="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded transition-colors"
        >
            Seleccione Otra Ubicacion
        </button>
    </div>
{/if}


        <!-- Step 4: Enter Product Code (only if brand is selected) -->
        {#if selectedBodega && ubicacion && selectedMarca}
            <div>
                <label for="barcodeInput" class="block text-sm font-medium text-gray-700">
                    4. Codigo Interno o Numero de Parte
                </label>
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

    <!-- Loading overlay -->
    {#if loading}
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    {/if}

    <!-- Product Details (rest of the form remains the same) -->
  <!-- Product Details -->
  {#if currentProduct}
  <div class="mb-4 bg-white p-4 rounded shadow">
      <div class="grid grid-cols-2 gap-4 mb-4">
          <p><strong>Codigo de Barras:</strong> {currentProduct.codigo_barras}</p>
          <p><strong>Numero Parte:</strong> {currentProduct.numero_parte}</p>
          <p><strong>Descripcion:</strong> {currentProduct.descripcion}</p>
          <p><strong>Fecha Inventario:</strong> {formatDateTime(currentProduct.fecha_inventario)}</p>
      </div>

      <div class="space-y-4">
          <!-- New EAN-13 fields -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      class="block w-full mt-1 p-2 border rounded" 
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
                      class="block w-full mt-1 p-2 border rounded" 
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
                  class="block w-full mt-1 p-2 border rounded" 
              />
          </div>

          <div>
              <label for="categoriaIncidencia" class="block text-sm font-medium text-gray-700">
                  Categoría Incidencia
              </label>
              <select 
                  id="categoriaIncidencia" 
                  bind:value={selectedCategoriaIncidencia} 
                  class="block w-full mt-1 p-2 border rounded"
              >
                  <option value="">Seleccione una Categoria</option>
                  {#each categoriasIncidencias as categoria}
                      <option value={categoria}>{categoria}</option>
                  {/each}
              </select>
          </div>

          <div>
              <label for="incidencia" class="block text-sm font-medium text-gray-700">
                  Notas
              </label>
              <textarea
                  id="incidencia" 
                  bind:value={incidencia} 
                  class="block w-full mt-1 p-2 border rounded"></textarea>
             
          </div>

          <div class="flex gap-4 mt-4">
              <button 
                  on:click={saveChanges} 
                  class="bg-green-500 hover:bg-green-600 text-white p-2 rounded transition-colors"
              >
                  Guardar
              </button>
              <button 
                  on:click={resetFields} 
                  class="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded transition-colors"
              >
                  Cancelar
              </button>
          </div>
      </div>
  </div>
{/if}




    <!-- Reset Buttons -->
    <div class="flex gap-4">

            
            {#if selectedMarca && !currentProduct}
                <button
                    on:click={resetBrand}
                    class="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded transition-colors"
                >
                    Seleccione otra Marca
                </button>
            {/if}

    </div>
</div>