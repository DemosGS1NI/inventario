<script>
    
    import { onMount } from 'svelte';
    
    let items = [];
    let currentPage = 1;
    let totalPages = 1;
    let pageSize = 10;

    async function fetchPage(page = 1) {
        try {
            const res = await fetch(`/api/inventario?page=${page}&limit=${pageSize}`);
            const { data, totalPages: total } = await res.json();
            items = data;
            totalPages = total;
            currentPage = page;
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

      // Function to navigate back to the main menu
     function goToMainMenu() {
    goto('/'); // Assuming your main menu is at the root '/'
  }
</script>

<!-- Report Table -->
<div class="overflow-x-auto">
    <table class="min-w-full bg-white border border-gray-300 rounded-lg shadow-md">
        <thead>
            <tr class="bg-gray-100">
                <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">ID</th>
                <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Código de Barras</th>
                <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">GTIN</th>
                <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Bodega</th>
                <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Ubicación</th>
                <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Marca</th>
                <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Número de Parte</th>
                <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Descripción</th>
                <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Inventario en Sistema</th>
            </tr>
        </thead>
        <tbody>
            {#each items as item}
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.id}</td>
                    <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.codigo_barras}</td>
                    <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.gtin}</td>
                    <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.bodega}</td>
                    <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.ubicacion}</td>
                    <td class="px-4 py-2 text-sm text-gray-800 border-b">{item.marca}</td>
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
        Previous
    </button>
    <span class="text-sm text-gray-700">
        Page {currentPage} of {totalPages}
    </span>
    <button 
        on:click={() => changePage(currentPage + 1)} 
        disabled={currentPage === totalPages}
        class="bg-gray-300 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-400 disabled:opacity-50">
        Next
    </button>
</div>
<!-- Add the "Back to Main Menu" button at the bottom -->
<div class="mt-4">
    <button 
      on:click={goToMainMenu} 
      class="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700">
      Regresar al Menu Principal
    </button>
  </div>
