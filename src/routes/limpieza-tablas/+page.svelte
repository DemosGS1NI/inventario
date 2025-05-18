<script>
  import { onMount } from 'svelte';
  import BackToMenu from '$lib/BackToMenu.svelte';
  import { addToast } from '$lib/stores/toast';

  let loading = false;

  async function cleanInventoryTable() {
    if (!confirm('¿Está seguro que desea limpiar la tabla de inventario? Esta acción no se puede deshacer.')) {
      return;
    }

    loading = true;
    try {
      const response = await fetch('/api/inventario', {
        method: 'DELETE',
        headers: {
          'X-Confirm-Delete': 'DELETE-ALL-INVENTORY'
        }
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        addToast(`Limpieza completada. ${data.data.deletedCount} registros eliminados.`, 'success');
      } else {
        throw new Error(data.message || 'Error al limpiar el inventario');
      }
    } catch (error) {
      console.error('Error:', error);
      addToast('Error al limpiar el inventario: ' + error.message, 'error');
    } finally {
      loading = false;
    }
  }
</script>

<div class="p-6 bg-gray-100 min-h-screen">
  <h1 class="text-2xl font-bold mb-4">Limpieza de Tablas</h1>

  <BackToMenu />

  <div class="mt-6 space-y-6">
    <!-- Inventory Table Cleanup -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-xl font-semibold mb-4">Tabla de Inventario</h2>
      <p class="text-gray-600 mb-4">
        Esta opción limpiará todos los registros de la tabla de inventario. 
        Use esta opción cuando necesite iniciar un nuevo proceso de inventario.
      </p>
      <button
        class="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 
               disabled:bg-gray-400 disabled:cursor-not-allowed
               transition-colors"
        on:click={cleanInventoryTable}
        disabled={loading}
      >
        {#if loading}
          <span class="inline-block">Limpiando...</span>
        {:else}
          <span class="inline-block">Limpiar Tabla de Inventario</span>
        {/if}
      </button>
    </div>
  </div>
</div>