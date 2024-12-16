<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import BackToMenuButton from '$lib/BackToMenu.svelte'; // Reusable back-to-menu button

  let inventoryData = writable([]);
  let categoriasIncidencias = []; // Holds categories from the database
  let currentPage = 1;
  let totalPages = 1;
  let isLoading = false;
  let selectedRecord = null;

  // Fetch inventory data
  async function fetchInventory(page = 1) {
    isLoading = true;
    try {
      const res = await fetch(`/api/inventario?page=${page}&limit=10`);
      const data = await res.json();
      if (res.ok) {
        inventoryData.set(data.data);
        totalPages = data.totalPages;
        currentPage = page;
      } else {
        console.error('Error fetching inventory:', data.error);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      isLoading = false;
    }
  }

  // Fetch categories for Categoria Incidencia dropdown
  async function fetchCategoriasIncidencias() {
    try {
      const res = await fetch('/api/categorias-incidencias');
      const data = await res.json();
      if (res.ok) {
        categoriasIncidencias = data.map((item) => item.categoria); // Extract category names
      } else {
        console.error('Error fetching categorias incidencias:', data.error);
      }
    } catch (error) {
      console.error('Error fetching categorias incidencias:', error);
    }
  }

  // Go to a specific page for pagination
  function goToPage(page) {
    if (page > 0 && page <= totalPages) {
      fetchInventory(page);
    }
  }

  // Open modal to edit a record
  function editRecord(record) {
    selectedRecord = { ...record };
  }

  // Save changes to the record
  async function saveRecord() {
    try {
      const res = await fetch('/api/producto', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bodega: selectedRecord.bodega,
          marca: selectedRecord.marca,
          ubicacion: selectedRecord.ubicacion,
          codigo_barras: selectedRecord.codigo_barras,
          inventario_fisico: selectedRecord.inventario_fisico,
          categoria_incidencia: selectedRecord.categoria_incidencia,
          incidencia: selectedRecord.incidencia,
          actualizado_por: selectedRecord.actualizado_por,
        }),
      });

      if (!res.ok) throw new Error('Error saving record');

      fetchInventory(currentPage);
      selectedRecord = null;
    } catch (error) {
      console.error('Error saving record:', error);
    }
  }

  onMount(() => {
    fetchInventory();
    fetchCategoriasIncidencias(); // Fetch categories on mount
  });
</script>

<div class="p-6 bg-gray-100 min-h-screen flex flex-col">
  <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">
    Administración de Toma de Inventario
  </h1>

  <!-- Back to Menu Button -->
  <div class="mb-6">
    <BackToMenuButton />
  </div>

  <!-- Table -->
  <div class="overflow-x-auto bg-white shadow-md rounded-lg mb-4">
    <table class="table-auto w-full text-left border-collapse">
      <thead>
        <tr class="bg-gray-200 text-gray-700">
          <th class="p-3 border">Bodega</th>
          <th class="p-3 border">Ubicación</th>
          <th class="p-3 border">Marca</th>
          <th class="p-3 border">Código de Barra</th>
          <th class="p-3 border">Número de Parte</th>
          <th class="p-3 border">Descripción</th>
          <th class="p-3 border">Inventario Sistema</th>
          <th class="p-3 border">Inventario Físico</th>
          <th class="p-3 border">Fecha Inventario</th>
          <th class="p-3 border">Categoría Incidencia</th>
          <th class="p-3 border">Notas Incidencias</th>
          <th class="p-3 border">Actualizado Por</th>
          <th class="p-3 border">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if $inventoryData.length > 0}
          {#each $inventoryData as record}
            <tr class="hover:bg-gray-50">
              <td class="p-3 border">{record.bodega}</td>
              <td class="p-3 border">{record.ubicacion}</td>
              <td class="p-3 border">{record.marca}</td>
              <td class="p-3 border">{record.codigo_barras}</td>
              <td class="p-3 border">{record.numero_parte}</td>
              <td class="p-3 border">{record.descripcion}</td>
              <td class="p-3 border">{record.inventario_sistema}</td>
              <td class="p-3 border">{record.inventario_fisico}</td>
              <td class="p-3 border">{record.fecha_inventario}</td>
              <td class="p-3 border">{record.categoria_incidencia}</td>
              <td class="p-3 border">{record.incidencia}</td>
              <td class="p-3 border">{record.actualizado_por}</td>
              <td class="p-3 border">
                <button
                  on:click={() => editRecord(record)}
                  class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  title="Edit Record"
                >
                  Edit
                </button>
              </td>
            </tr>
          {/each}
        {:else}
          <tr>
            <td colspan="13" class="p-3 text-center text-gray-500">No records found.</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  <div class="flex justify-between items-center">
    <button
      on:click={() => goToPage(currentPage - 1)}
      class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      disabled={currentPage === 1}
    >
      Previous
    </button>
    <span class="text-gray-600">Page {currentPage} of {totalPages}</span>
    <button
      on:click={() => goToPage(currentPage + 1)}
      class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      disabled={currentPage === totalPages}
    >
      Next
    </button>
  </div>

  <!-- Edit Modal -->
  {#if selectedRecord}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center backdrop-blur-md">
      <div class="bg-white p-8 rounded-lg shadow-lg w-1/2">
        <h2 class="text-2xl font-bold mb-4">Edit Record</h2>
        <div class="space-y-4">
          <!-- Inputs for editing fields -->
        </div>
        <div class="flex justify-end space-x-4 mt-6">
          <button on:click={saveRecord} class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            Save
          </button>
          <button on:click={() => (selectedRecord = null)} class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
