<script>
  import { onMount } from 'svelte';
  import BackToMenu from '$lib/BackToMenu.svelte';
  import { adminInventoryStore } from '$lib/stores/adminInventory';
  import { formatDateTime } from '$lib/utils/dateFormat';
  import { 
    Maximize2, 
    Minimize2, 
    RefreshCw,
    ChevronDown,
    AlertTriangle,
    CheckCircle,
    XCircle 
  } from 'lucide-svelte';

  // Subscribe to the store
  $: ({ 
    bodegas, 
    marcas, 
    ubicaciones, 
    records,
    selectedBodega,
    selectedMarca,
    selectedUbicacion,
    loading,
    error,
    lastUpdated,
    isFullscreen 
  } = $adminInventoryStore);

  // Touch feedback handlers
  function handleTouchStart(event) {
    event.target.classList.add('active');
  }

  function handleTouchEnd(event) {
    event.target.classList.remove('active');
  }

  // Handle selection changes
  function handleBodegaChange(event) {
    const newBodega = event.target.value;
    adminInventoryStore.setSelections(newBodega, '', '');
    if (newBodega) fetchUbicaciones();
  }

  function handleUbicacionChange(event) {
    const newUbicacion = event.target.value;
    adminInventoryStore.setSelections(selectedBodega, '', newUbicacion);
    if (newUbicacion) fetchMarcas();
  }

  function handleMarcaChange(event) {
    const newMarca = event.target.value;
    adminInventoryStore.setSelections(selectedBodega, newMarca, selectedUbicacion);
    if (newMarca) fetchRecords();
  }

  // Fetch functions
  async function fetchBodegas() {
    adminInventoryStore.setLoading(true);
    try {
      const res = await fetch('/api/bodegas');
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        adminInventoryStore.setBodegas(data.data);
        // If we have stored selections, fetch related data
        if (selectedBodega) {
          await fetchUbicaciones();
          if (selectedUbicacion) {
            await fetchMarcas();
            if (selectedMarca) {
              await fetchRecords();
            }
          }
        }
      } else {
        adminInventoryStore.setError('Error fetching bodegas: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      adminInventoryStore.setError('Error fetching bodegas: ' + error.message);
    } finally {
      adminInventoryStore.setLoading(false);
    }
  }
  
  async function fetchMarcas() {
    if (!selectedBodega || !selectedUbicacion) return;
    console.log('Fetching marcas for bodega and ubicacion:', { selectedBodega, selectedUbicacion });
    
    try {
      const url = `/api/fetch-marcas?bodega=${encodeURIComponent(selectedBodega)}&ubicacion=${encodeURIComponent(selectedUbicacion)}`;
      console.log('Request URL:', url);
      
      const res = await fetch(url);
      const data = await res.json();
      console.log('Marcas response:', data);
      
      if (res.ok && data.status === 'success') {
        adminInventoryStore.setMarcas(data.data);
      } else {
        throw new Error(data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Marcas fetch error:', error);
      adminInventoryStore.setError('Error fetching marcas: ' + error.message);
    }
  }

  async function fetchUbicaciones() {
    if (!selectedBodega) {
        console.log('Missing required parameters:', { selectedBodega });
        return;
    }

    adminInventoryStore.setLoading(true);
    try {
        const url = `/api/fetch-ubicaciones?bodega=${encodeURIComponent(selectedBodega)}`;
        console.log('Fetching ubicaciones:', url);

        const res = await fetch(url);
        const data = await res.json();
        console.log('Ubicaciones response:', data);

        if (res.ok && data.status === 'success') {
            adminInventoryStore.setUbicaciones(data.data);
        } else {
            console.error('Error response:', data);
            adminInventoryStore.setError('Error fetching ubicaciones: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Fetch error:', error);
        adminInventoryStore.setError('Error fetching ubicaciones: ' + error.message);
    } finally {
        adminInventoryStore.setLoading(false);
    }
  }

  async function fetchRecords() {
    // Check parameters in the correct order of selection
    if (!selectedBodega || !selectedUbicacion || !selectedMarca) {
        console.log('Missing parameters:', { selectedBodega, selectedUbicacion, selectedMarca });
        return;
    }

    adminInventoryStore.setLoading(true);
    try {
        const url = `/api/inventory-records?bodega=${encodeURIComponent(selectedBodega)}&ubicacion=${encodeURIComponent(selectedUbicacion)}&marca=${encodeURIComponent(selectedMarca)}`;
        console.log('Fetching records with URL:', url);
        
        const res = await fetch(url);
        const data = await res.json();
        console.log('Response data:', data);

        if (res.ok && data.status === 'success') {
            adminInventoryStore.setRecords(data.data);
        } else if (res.status === 404) {
            // Handle the "Product not found" case
            adminInventoryStore.setRecords([]);  // Set empty records array
            adminInventoryStore.setError('No se encontraron registros para esta selección');
        } else {
            // Handle other errors
            const errorMessage = data.error?.message || 'Error desconocido';
            adminInventoryStore.setError('Error al cargar registros: ' + errorMessage);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        adminInventoryStore.setError('Error al cargar registros: ' + error.message);
    } finally {
        adminInventoryStore.setLoading(false);
    }
}

  async function validateRecord(record) {
    try {
      adminInventoryStore.setLoading(true);
      const res = await fetch('/api/validate-record', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: record.id,
          validado_por: record.validado_por
        }),
      });

      const data = await res.json();
      
      if (res.ok && data.status === 'success') {
        await fetchRecords();
      } else {
        adminInventoryStore.setError('Error validating record: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      adminInventoryStore.setError('Error validating record: ' + error.message);
    } finally {
      adminInventoryStore.setLoading(false);
    }
  }

  function calculateDiferencia(inventario_sistema, inventario_fisico) {
    return inventario_fisico - inventario_sistema;
  }

  function calculateTipoDiferencia(inventario_sistema, inventario_fisico) {
    if (inventario_sistema > inventario_fisico) {
      return 'Faltante';
    } else if (inventario_sistema < inventario_fisico) {
      return 'Sobrante';
    } else {
      return 'Sin Diferencia';
    }
  }

  // Manual refresh function with debounce
  let refreshTimeout;
  async function refreshData() {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    
    if (selectedBodega && selectedMarca && selectedUbicacion) {
      refreshTimeout = setTimeout(async () => {
        await fetchRecords();
      }, 300);
    }
  }

  onMount(async () => {
    await fetchBodegas();
  });
</script>

<div class="p-4 bg-gray-100 min-h-screen {isFullscreen ? 'fixed inset-0 z-50' : ''} touch-manipulation">
  <!-- Header with controls -->
  <div class="flex justify-between items-center mb-4 sticky top-0 bg-gray-100 p-2 z-10">
    <div class="flex items-center gap-2">
      <h1 class="text-xl font-bold md:text-2xl">Administracion del Inventario</h1>
    </div>
    <div><BackToMenu /></div>
    
    <div class="flex items-center gap-2">
      <button 
        class="p-3 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation"
        on:click={() => adminInventoryStore.toggleFullscreen()}
        on:touchstart={handleTouchStart}
        on:touchend={handleTouchEnd}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {#if isFullscreen}
          <Minimize2 size={24} />
        {:else}
          <Maximize2 size={24} />
        {/if}
      </button>
      
      <button 
        class="flex items-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-lg disabled:bg-gray-400
               hover:bg-blue-600 active:bg-blue-700 transition-colors touch-manipulation"
        on:click={refreshData}
        on:touchstart={handleTouchStart}
        on:touchend={handleTouchEnd}
        disabled={loading || !selectedUbicacion}
      >
        <RefreshCw size={20} class={loading ? 'animate-spin' : ''} />
        <span class="hidden md:inline">{loading ? 'Refreshing...' : 'Refresh'}</span>
      </button>
    </div>
  </div>

  <!-- Filters -->
  <div class="flex flex-col md:flex-row gap-4 mb-6 sticky top-16 bg-gray-100 z-10 p-2">
    <div class="relative flex-1">
      <select 
        value={selectedBodega}
        on:change={handleBodegaChange}
        class="w-full h-12 px-4 pr-10 rounded-lg border border-gray-300 focus:border-blue-500 
               focus:ring-2 focus:ring-blue-200 appearance-none bg-white touch-manipulation"
      >
        <option value="">Seleccionar Bodega</option>
        {#each bodegas as bodega}
          <option value={bodega}>{bodega}</option>
        {/each}
      </select>
      <ChevronDown 
        size={20} 
        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
      />
    </div>

    <div class="relative flex-1">
      <select 
        value={selectedUbicacion}
        on:change={handleUbicacionChange}
        disabled={!selectedBodega}
        class="w-full h-12 px-4 pr-10 rounded-lg border border-gray-300 focus:border-blue-500 
               focus:ring-2 focus:ring-blue-200 appearance-none bg-white touch-manipulation
               disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">Seleccionar Ubicación</option>
        {#each ubicaciones as ubicacion}
          <option value={ubicacion}>{ubicacion}</option>
        {/each}
      </select>
      <ChevronDown 
        size={20} 
        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
      />
    </div>

    <div class="relative flex-1">
      <select 
        value={selectedMarca}
        on:change={handleMarcaChange}
        disabled={!selectedUbicacion}
        class="w-full h-12 px-4 pr-10 rounded-lg border border-gray-300 focus:border-blue-500 
               focus:ring-2 focus:ring-blue-200 appearance-none bg-white touch-manipulation
               disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">Seleccionar Marca</option>
        {#each marcas as marca}
          <option value={marca}>{marca}</option>
        {/each}
      </select>
      <ChevronDown 
        size={20} 
        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
      />
    </div>
  </div>

  <!-- Status messages -->
  {#if loading}
    <div class="fixed bottom-4 right-4 bg-blue-100 text-blue-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
      <RefreshCw size={20} class="animate-spin" />
      Actualizando...
    </div>
  {/if}

  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
      <AlertTriangle size={20} />
      {error}
    </div>
  {/if}

  <!-- Last updated info -->
  {#if lastUpdated}
    <div class="text-sm text-gray-600 mb-4">
      Última actualización: {lastUpdated}
    </div>
  {/if}

  <!-- Records Table -->
  {#if records.length > 0}
    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Código
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parte</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sistema</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Físico</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diferencia</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incidencia</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventariante</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
            <th class="sticky right-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each records as record}
            <tr class="hover:bg-gray-50 touch-manipulation">
              <td class="sticky left-0 bg-white px-6 py-4 whitespace-nowrap">{record.codigo_barras}</td>
              <td class="px-6 py-4 whitespace-nowrap">{record.numero_parte}</td>
              <td class="px-6 py-4">{record.descripcion}</td>
              <td class="px-6 py-4 whitespace-nowrap">{record.inventario_sistema}</td>
              <td class="px-6 py-4 whitespace-nowrap">{record.inventario_fisico}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                {calculateDiferencia(record.inventario_sistema, record.inventario_fisico)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                  {record.inventario_sistema > record.inventario_fisico ? 'bg-red-100 text-red-800' : 
                   record.inventario_sistema < record.inventario_fisico ? 'bg-yellow-100 text-yellow-800' : 
                   'bg-green-100 text-green-800'}">
                  {calculateTipoDiferencia(record.inventario_sistema, record.inventario_fisico)}
                </span>
              </td>
              <td class="px-6 py-4">{record.incidencia}</td>
              <td class="px-6 py-4 whitespace-nowrap">{record.nombre}</td>
              <td class="px-6 py-4 whitespace-nowrap">{formatDateTime(record.fecha_inventario)}</td>
              <td class="sticky right-0 bg-white px-6 py-4 whitespace-nowrap">
                <button
                  class="flex items-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-lg 
                         hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-400 transition-colors
                         touch-manipulation"
                  on:click={() => validateRecord(record)}
                  on:touchstart={handleTouchStart}
                  on:touchend={handleTouchEnd}
                  disabled={record.validado}
                >
                  {#if record.validado}
                    <CheckCircle size={20} />
                    <span class="hidden md:inline">Validado</span>
                  {:else}
                    <XCircle size={20} />
                    <span class="hidden md:inline">Validar</span>
                  {/if}
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="text-center py-8 text-gray-500">
      No se encontraron registros.
    </div>
  {/if}
</div>

<style>
  /* Add touch-specific styles */
  :global(.touch-manipulation) {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  :global(.active) {
    transform: scale(0.98);
  }
</style>        