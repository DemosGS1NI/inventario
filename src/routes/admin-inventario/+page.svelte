<script>
  import { onMount } from 'svelte';
  import BackToMenu from '$lib/BackToMenu.svelte';

  // Data variables
  let bodegas = [];
  let marcas = [];
  let ubicaciones = [];
  let records = [];

  let selectedBodega = '';
  let selectedMarca = '';
  let selectedUbicacion = '';

  let message = '';

  // Fetch warehouses (bodegas)
  async function fetchBodegas() {
  try {
    const res = await fetch('/api/bodegas');
    const data = await res.json();

    if (res.ok && data.status === 'success') {
      bodegas = data.data; // Assign the fetched bodega names to the `bodegas` variable
      console.log('Bodegas fetched:', bodegas);
    } else {
      console.error('Error fetching bodegas:', data.message || 'Unknown error');
    }
    } catch (error) {
      console.error('Error fetching bodegas:', error);
    }
  }

  // Fetch marcas based on selected bodega
  async function fetchMarcas() {
  if (!selectedBodega) {
    console.error('Error: No bodega selected.');
    return;
  }

  try {
    const res = await fetch(`/api/marcas?bodega=${encodeURIComponent(selectedBodega)}`);
    const data = await res.json();

    if (res.ok && data.status === 'success') {
      marcas = data.data; // Assign the fetched marcas to the `marcas` variable
      console.log('Marcas fetched:', marcas);
    } else {
      console.error('Error fetching marcas:', data.message || 'Unknown error');
      message = 'Error fetching marcas. Please try again.';
    }
  } catch (error) {
    console.error('Error fetching marcas:', error);
    message = 'An unexpected error occurred while fetching marcas.';
  }
}

  // Fetch locations (ubicaciones)
  async function fetchUbicaciones() {
  if (!selectedBodega || !selectedMarca) {
    console.error('Error: No Bodega or Marca selected.');
    return;
  }

  try {
    const res = await fetch(
      `/api/ubicaciones?bodega=${encodeURIComponent(selectedBodega)}&marca=${encodeURIComponent(selectedMarca)}`
    );
    const data = await res.json();

    if (res.ok && data.status === 'success') {
      ubicaciones = data.data; // Assign the fetched ubicaciones to the `ubicaciones` variable
      console.log('Ubicaciones fetched:', ubicaciones);
    } else {
      console.error('Error fetching ubicaciones:', data.message || 'Unknown error');
      message = data.message || 'Error fetching ubicaciones. Please try again.';
    }
  } catch (error) {
    console.error('Error fetching ubicaciones:', error);
    message = 'An unexpected error occurred while fetching ubicaciones.';
  }
}

  // Fetch records
  async function fetchRecords() {

    if (!selectedBodega || !selectedMarca || !selectedUbicacion) {
    console.error('Error: No Bodega or Marca or Ubicacion selected.');
    return;
  }

  try {
    const res = await fetch(
      `/api/inventory-records?bodega=${encodeURIComponent(selectedBodega)}&marca=${encodeURIComponent(selectedMarca)}&ubicacion=${encodeURIComponent(selectedUbicacion)}`
    );
    const data = await res.json();

    if (res.ok && data.status === 'success') {
      records = data.data; // Assign the fetched ubicaciones to the `ubicaciones` variable
      console.log('Records fetched');
    } else {
      console.error('Error fetching records:', data.message || 'Unknown error');
      message = data.message || 'Error fetching records. Please try again.';
    }
  } catch (error) {
    console.error('Error fetching records:', error);
    message = 'An unexpected error occurred while fetching records.';
  }

  }

  // Validate record
  async function validateRecord(record) {
    try {
      const payload = {
        id: record.id,
        validado_por: record.validado_por // User ID from JWT
        
      };

      const res = await fetch('/api/validate-record', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error('Failed to validate record');
        return;
      }

      message = 'Record validated successfully';
      await fetchRecords();
    } catch (error) {
      console.error('Error validating record:', error);
    }
  }

  // Calculate diferencia
  function calculateDiferencia(inventario_sistema, inventario_fisico) {
    return inventario_fisico - inventario_sistema;
  }

    // Calculate diferencia
  function calculateTipoDiferencia(inventario_sistema, inventario_fisico) {
    
    if (inventario_sistema > inventario_fisico) {
       return 'Faltante'; }
    else if (inventario_sistema < inventario_fisico) {
       return 'Sobrante'; } 
    else {
      return 'Sin Diferencia';}
  }

  // Format timestamp
  function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const formatter = new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return formatter.format(date);
  }


  // Load data on mount
  onMount(async () => {
    await fetchBodegas();
  });
</script>

<div class="p-6 bg-gray-100 min-h-screen">
  <h1 class="text-2xl font-bold mb-4">Admin Inventory Validation</h1>

  <BackToMenu />
  <!-- Filters -->
  <div class="flex gap-4 mb-6">
    <div>
      <label for="bodega" class="block text-sm font-medium text-gray-700">Bodega</label>
      <select id="bodega" bind:value={selectedBodega} on:change={fetchMarcas} class="w-full border rounded p-2">
        <option value="">Bodega</option>
        {#each bodegas as bodega}
          <option value={bodega}>{bodega}</option>
        {/each}
      </select>
    </div>
    <div>
      <label for="marca" class="block text-sm font-medium text-gray-700">Marca</label>
      <select id="marca" bind:value={selectedMarca} on:change={fetchUbicaciones} class="w-full border rounded p-2">
        <option value="">Marca</option>
        {#each marcas as marca}
          <option value={marca}>{marca}</option>
        {/each}
      </select>
    </div>
    <div>
      <label for="ubicacion" class="block text-sm font-medium text-gray-700">Ubicación</label>
      <select id="ubicacion" bind:value={selectedUbicacion} on:change={fetchRecords} class="w-full border rounded p-2">
        <option value="">Ubicación</option>
        {#each ubicaciones as ubicacion}
          <option value={ubicacion}>{ubicacion}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Records Table -->
  {#if records.length > 0}
    <table class="table-auto w-full bg-white shadow-md rounded">
      <thead class="bg-gray-200">
        <tr>
          <th class="p-2 border">Código de Barras</th>
          <th class="p-2 border">Numero de Parte</th>
          <th class="p-2 border">Descripcion</th>
          <th class="p-2 border">Inventario Sistema</th>
          <th class="p-2 border">Inventario Físico</th>
          <th class="p-2 border">Diferencia</th>
          <th class="p-2 border">Tipo</th>
          <th class="p-2 border">Incidencia</th>
          <th class="p-2 border">Inventariante</th>
          <th class="p-2 border">Fecha de Inventario</th>
          <th class="p-2 border">Validado</th>
          <th class="p-2 border">Validado Por</th>
          <th class="p-2 border">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#each records as record}
          <tr>
            <td class="p-2 border">{record.codigo_barras}</td>
            <td class="p-2 border">{record.numero_parte }</td>
            <td class="p-2 border">{record.descripcion }</td>
            <td class="p-2 border">{record.inventario_sistema }</td>
            <td class="p-2 border">{record.inventario_fisico}</td>
            <td class="p-2 border">{calculateDiferencia(record.inventario_sistema, record.inventario_fisico)}</td>
            <td class="p-2 border">{calculateTipoDiferencia(record.inventario_sistema, record.inventario_fisico)}</td>
            <td class="p-2 border">{record.incidencia}</td>
            <td class="p-2 border">{record.nombre}</td>
            <td class="p-2 border">{formatTimestamp(record.fecha_inventario)}</td>
            <td class="p-2 border">{record.validado ? 'Sí' : 'No'}</td>
            <td class="p-2 border">{record.validado_por}</td>
            <td class="p-2 border">
              <button
                class="bg-blue-500 text-white px-4 py-2 rounded"
                on:click={() => validateRecord(record)}
              >
                Validate
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p class="text-gray-600">No records found.</p>
  {/if}

  {#if message}
    <p class="text-green-600 mt-4">{message}</p>
  {/if}
</div>
