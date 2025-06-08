<script>


  import { onMount } from 'svelte';
  import { addToast } from '$lib/stores/toast';
  import { formatDateTime } from '$lib/utils/dateFormat';
  import BackToMenuButton from '$lib/BackToMenu.svelte';
  import { page } from '$app/stores';

  // Get user role from the layout data (already available)
  $: userRole = $page.data?.userRole || '';
  
  // Data variables
  let movements = [];
  let bodegas = [];
  let marcas = [];
  let ubicaciones = [];
  let loading = false;

  // Filter variables
  let selectedBodega = '';
  let selectedUbicacion = '';
  let selectedMarca = '';

  onMount(async () => {
    await fetchBodegas();
    await fetchMovements(); // Load all movements initially
  });

  async function fetchBodegas() {
    try {
      const res = await fetch('/api/inventario/fetch-bodegas');
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        bodegas = data.data;
      } else {
        addToast('Error al cargar bodegas: ' + (data.message || 'Error desconocido'), 'error');
      }
    } catch (error) {
      addToast('Error al cargar bodegas: ' + error.message, 'error');
    }
  }

  async function fetchUbicaciones() {
    if (!selectedBodega) {
      ubicaciones = [];
      return;
    }
    
    try {
      const res = await fetch(`/api/inventario/fetch-ubicaciones?bodega=${encodeURIComponent(selectedBodega)}`);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        ubicaciones = data.data;
      } else {
        addToast('Error al cargar ubicaciones: ' + (data.message || 'Error desconocido'), 'error');
      }
    } catch (error) {
      addToast('Error al cargar ubicaciones: ' + error.message, 'error');
    }
  }

  async function fetchMarcas() {
    if (!selectedBodega || !selectedUbicacion) {
      marcas = [];
      return;
    }
    
    try {
      const res = await fetch(`/api/inventario/fetch-marcas?bodega=${encodeURIComponent(selectedBodega)}&ubicacion=${encodeURIComponent(selectedUbicacion)}`);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        marcas = data.data;
      } else {
        addToast('Error al cargar marcas: ' + (data.message || 'Error desconocido'), 'error');
      }
    } catch (error) {
      addToast('Error al cargar marcas: ' + error.message, 'error');
    }
  }

  async function fetchMovements() {
    loading = true;
    try {
      // Build query string with filters
      let queryParams = new URLSearchParams();
      if (selectedBodega) queryParams.append('bodega', selectedBodega);
      if (selectedUbicacion) queryParams.append('ubicacion', selectedUbicacion);
      if (selectedMarca) queryParams.append('marca', selectedMarca);

      const queryString = queryParams.toString();
      const url = `/api/db/movimientos${queryString ? '?' + queryString : ''}`;

      const res = await fetch(url);
      const data = await res.json();
      
      if (res.ok && data.status === 'success') {
        movements = data.data;
        if (movements.length === 0) {
          addToast('No se encontraron movimientos para los filtros seleccionados', 'info');
        }
      } else {
        addToast('Error al cargar movimientos: ' + (data.error?.message || 'Error desconocido'), 'error');
      }
    } catch (error) {
      addToast('Error al cargar movimientos: ' + error.message, 'error');
    } finally {
      loading = false;
    }
  }

  async function handleBodegaChange(event) {
    selectedBodega = event.target.value;
    selectedUbicacion = '';
    selectedMarca = '';
    ubicaciones = [];
    marcas = [];
    
    if (selectedBodega) {
      await fetchUbicaciones();
    }
    await fetchMovements();
  }

  async function handleUbicacionChange(event) {
    selectedUbicacion = event.target.value;
    selectedMarca = '';
    marcas = [];
    
    if (selectedUbicacion) {
      await fetchMarcas();
    }
    await fetchMovements();
  }

  async function handleMarcaChange(event) {
    selectedMarca = event.target.value;
    await fetchMovements();
  }

  function clearFilters() {
    selectedBodega = '';
    selectedUbicacion = '';
    selectedMarca = '';
    ubicaciones = [];
    marcas = [];
    fetchMovements();
  }

  function getTipoLabel(tipo) {
    return tipo === 'IN' ? 'Entrada' : 'Salida';
  }

  function getTipoClass(tipo) {
    return tipo === 'IN' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  }

  async function exportMovements() {
    try {
      addToast('Exportando movimientos...', 'info');
      
      // Use the same filters for export
      let queryParams = new URLSearchParams();
      if (selectedBodega) queryParams.append('bodega', selectedBodega);
      if (selectedUbicacion) queryParams.append('ubicacion', selectedUbicacion);
      if (selectedMarca) queryParams.append('marca', selectedMarca);
      queryParams.append('export', 'true');

      const queryString = queryParams.toString();
      const url = `/api/db/movimientos${queryString ? '?' + queryString : '?export=true'}`;

      const response = await fetch(url);
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `movimientos_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        
        addToast('Movimientos exportados exitosamente', 'success');
      } else {
        addToast('Error al exportar movimientos', 'error');
      }
    } catch (error) {
      addToast('Error al exportar: ' + error.message, 'error');
    }
  }


  // Add this variable to track user role
export let data = {}; // Will receive user data from layout
$: userRole = data?.userRole || '';

// Add delete function
async function deleteMovement(movementId, movementDescription) {
  if (!confirm(`¿Está seguro que desea eliminar este movimiento?\n\n${movementDescription}`)) {
    return;
  }

  try {
    const response = await fetch(`/api/db/movimientos/${movementId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      addToast('Movimiento eliminado exitosamente', 'success');
      // Refresh the movements list
      await fetchMovements();
    } else {
      addToast('Error al eliminar movimiento: ' + (data.error?.message || 'Error desconocido'), 'error');
    }
  } catch (error) {
    addToast('Error al eliminar movimiento: ' + error.message, 'error');
  }
}
</script>

<div class="p-6 bg-gray-100 min-h-screen">
  <h1 class="text-2xl font-bold mb-4">Historial de Movimientos</h1>

  <div class="mb-6">
    <BackToMenuButton />
  </div>

  <!-- Filters Section -->
  <div class="bg-white p-4 rounded shadow mb-6">
    <h3 class="text-lg font-semibold mb-4">Filtros</h3>
    
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <!-- Bodega Filter -->
      <div>
        <label for="filterBodega" class="block text-sm font-medium text-gray-700">Bodega</label>
        <select 
          id="filterBodega" 
          value={selectedBodega} 
          on:change={handleBodegaChange}
          class="w-full border rounded p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Todas las Bodegas</option>
          {#each bodegas as bodega}
            <option value={bodega}>{bodega}</option>
          {/each}
        </select>
      </div>

      <!-- Ubicacion Filter -->
      <div>
        <label for="filterUbicacion" class="block text-sm font-medium text-gray-700">Ubicación</label>
        <select 
          id="filterUbicacion" 
          value={selectedUbicacion} 
          on:change={handleUbicacionChange}
          disabled={!selectedBodega}
          class="w-full border rounded p-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        >
          <option value="">Todas las Ubicaciones</option>
          {#each ubicaciones as ubicacion}
            <option value={ubicacion}>{ubicacion}</option>
          {/each}
        </select>
      </div>

      <!-- Marca Filter -->
      <div>
        <label for="filterMarca" class="block text-sm font-medium text-gray-700">Marca</label>
        <select 
          id="filterMarca" 
          value={selectedMarca} 
          on:change={handleMarcaChange}
          disabled={!selectedUbicacion}
          class="w-full border rounded p-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        >
          <option value="">Todas las Marcas</option>
          {#each marcas as marca}
            <option value={marca}>{marca}</option>
          {/each}
        </select>
      </div>

      <!-- Actions -->
      <div class="flex items-end gap-2">
        <button
          on:click={clearFilters}
          class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
        >
          Limpiar Filtros
        </button>
        <button
          on:click={exportMovements}
          disabled={movements.length === 0}
          class="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
        >
          Exportar
        </button>
      </div>
    </div>
  </div>

  <!-- Loading indicator -->
  {#if loading}
    <div class="text-center py-4">
      <div class="inline-flex items-center">
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Cargando movimientos...
      </div>
    </div>
  {/if}

  <!-- Movements Table -->
  <div class="bg-white rounded shadow overflow-hidden">
    <div class="px-4 py-3 bg-gray-50 border-b">
      <h3 class="text-lg font-semibold">
        Movimientos ({movements.length} registros)
      </h3>
    </div>

    {#if movements.length > 0}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha/Hora
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bodega
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ubicación
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Marca
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Código
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Producto
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cantidad
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documento
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Comentarios
              </th>
              {#if userRole === 'Admin'}
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
              </th>
{/if}
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each movements as movement}
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDateTime(movement.fecha_movimiento)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {getTipoClass(movement.tipo_movimiento)}">
                    {getTipoLabel(movement.tipo_movimiento)}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {movement.bodega}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {movement.ubicacion || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {movement.marca}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {movement.codigo_barras}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                  <div>
                    <div class="font-medium">{movement.numero_parte}</div>
                    <div class="text-gray-500 text-xs">{movement.descripcion}</div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {movement.cantidad}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {movement.numero_documento || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {movement.usuario_nombre || '-'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                  {movement.comentarios || '-'}
                </td>
                {#if userRole === 'Admin'}
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      on:click={() => deleteMovement(
                        movement.id, 
                        `${getTipoLabel(movement.tipo_movimiento)}: ${movement.cantidad} - ${movement.numero_parte || movement.codigo_barras}`
                      )}
                      class="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                      title="Eliminar movimiento"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                      <span class="ml-1">Eliminar</span>
                    </button>
                  </td>
                {/if}

              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else if !loading}
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No hay movimientos</h3>
        <p class="mt-1 text-sm text-gray-500">
          {selectedBodega || selectedUbicacion || selectedMarca 
            ? 'No se encontraron movimientos con los filtros seleccionados.'
            : 'Aún no se han registrado movimientos en el sistema.'}
        </p>
      </div>
    {/if}
  </div>
</div>