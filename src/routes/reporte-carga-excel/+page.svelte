<script>
    import { onMount } from 'svelte';
    import BackToMenuButton from '$lib/BackToMenu.svelte'; // Import the reusable button component
  
    let items = [];
    let currentPage = 1;
    let totalPages = 1;
    let pageSize = 10;
    let totalRecords = 0;
  
    async function fetchPage(page = 1) {
  try {
    const res = await fetch(`/api/reporte-carga-excel?page=${page}&limit=${pageSize}`);
    const result = await res.json();
    
    // Access the nested data structure
    items = result.data.items;
    totalPages = result.data.pagination.totalPages;
    totalRecords = result.data.pagination.totalRecords; // Add this line to get total records
    currentPage = page;

    // Calculate the current range of records being displayed
    const startRecord = (page - 1) * pageSize + 1;
    const endRecord = Math.min(page * pageSize, totalRecords);
    
    // Update your pagination display to show: "registros X-Y de Z"
    // You can use these variables to update your UI
    const paginationText = `registros ${startRecord}-${endRecord} de ${totalRecords}`;
    
    console.log('Fetched data:', {
      items,
      startRecord,
      endRecord,
      totalRecords,
      paginationText
    });
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}
  
    onMount(() => {
      fetchPage();
    });
  
    function changePage(page) {
      if (page >= 1 && page <= totalPages) {
        fetchPage(page);
      }
    }
  </script>
  
  <div class="p-6 bg-gray-100 min-h-screen flex flex-col">
    <!-- Title -->
    <h1 class="text-3xl font-bold text-center mb-6 text-gray-800">Reporte de Resultado de Carga EXCEL</h1>
  
    <!-- Back to Main Menu Button -->
    <div class="mb-6">
      <BackToMenuButton /> <!-- Use the reusable component -->
    </div>
  
    <!-- Report Table -->
    <div class="overflow-x-auto mb-4">
      <table class="min-w-full bg-white border border-gray-300 rounded-lg shadow-md">
        <thead>
          <tr class="bg-gray-100">
            <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Bodega</th>
            <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Marca</th>  
            <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Ubicación</th>          
            <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">ID</th>
            <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Código de Barras</th>
            <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">GTIN</th>
            <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Número de Parte</th>



            <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Descripción</th>
            <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Inventario en Sistema</th>
          </tr>
        </thead>
        <tbody>
          {#each items as item}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.bodega}</td>
              <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.marca}</td>
              <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.ubicacion}</td>              
              <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.id}</td>
              <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.codigo_barras}</td>
              <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.gtin}</td>
              <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.numero_parte}</td>
              <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.descripcion}</td>
              <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.inventario_sistema}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  
    <!-- Pagination Controls -->
    <div class="mt-4 flex items-center justify-between">
      <button 
        on:click={() => changePage(currentPage - 1)} 
        disabled={currentPage === 1}
        class="bg-gray-300 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-400 disabled:opacity-50">
        Anterior
      </button>
      <span class="text-sm text-gray-700">
        Página {currentPage} de {totalPages}
        {#if totalRecords > 0}
          <div class="pagination-info">
            Registros {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalRecords)} de {totalRecords}
          </div>
         {/if}
      </span>

      <button 
        on:click={() => changePage(currentPage + 1)} 
        disabled={currentPage === totalPages}
        class="bg-gray-300 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-400 disabled:opacity-50">
        Siguiente
      </button>
    </div>
  </div>
  