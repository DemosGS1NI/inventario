<script>
  import { onMount } from 'svelte';
  import BackToMenu from '$lib/BackToMenu.svelte';
  import { addToast } from '$lib/stores/toast';

  let expiredTokensCount = 0;
  let totalTokensCount = 0;
  let loading = false;
  let cleanupLoading = false;
  let lastChecked = null;
  let lastCleaned = null;

  // Fetch token statistics
  async function checkExpiredTokens() {
    loading = true;
    try {
      const response = await fetch('/api/auth/cleanup-tokens');
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        expiredTokensCount = data.data.expiredTokensCount;
        lastChecked = new Date().toLocaleString();
        addToast(`Found ${expiredTokensCount} expired tokens`, 'info');
      } else {
        throw new Error(data.message || 'Error checking expired tokens');
      }
    } catch (error) {
      console.error('Error:', error);
      addToast('Error checking expired tokens: ' + error.message, 'error');
    } finally {
      loading = false;
    }
  }

  // Clean up expired tokens
  async function cleanupExpiredTokens() {
    if (!confirm('¿Está seguro que desea limpiar los tokens vencidos? Esta acción no se puede deshacer.')) {
      return;
    }

    cleanupLoading = true;
    try {
      const response = await fetch('/api/auth/cleanup-tokens', {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        const cleanedCount = data.data.cleanedTokens;
        lastCleaned = new Date().toLocaleString();
        addToast(`${cleanedCount} tokens vencidos eliminados exitosamente`, 'success');
        
        // Refresh the count after cleanup
        await checkExpiredTokens();
      } else {
        throw new Error(data.message || 'Error cleaning up tokens');
      }
    } catch (error) {
      console.error('Error:', error);
      addToast('Error al limpiar tokens: ' + error.message, 'error');
    } finally {
      cleanupLoading = false;
    }
  }

  // Get additional statistics from database
  async function getTokenStatistics() {
    try {
      // You could create a separate endpoint for this, but for now we'll use the existing one
      await checkExpiredTokens();
    } catch (error) {
      console.error('Error getting statistics:', error);
    }
  }

  // Load data when component mounts
  onMount(() => {
    getTokenStatistics();
  });
</script>

<div class="p-6 bg-gray-100 min-h-screen">
  <h1 class="text-2xl font-bold mb-4">Limpieza de Tokens Vencidos</h1>

  <BackToMenu />

  <div class="mt-6 space-y-6">
    <!-- Statistics Card -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-xl font-semibold mb-4">Estadísticas de Tokens</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <!-- Expired Tokens Count -->
        <div class="bg-red-50 p-4 rounded-lg border border-red-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-red-600">Tokens Vencidos</p>
              <p class="text-2xl font-bold text-red-700">{expiredTokensCount}</p>
            </div>
            <div class="text-red-500">
              <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
              </svg>
            </div>
          </div>
          {#if lastChecked}
            <p class="text-xs text-red-500 mt-1">Última verificación: {lastChecked}</p>
          {/if}
        </div>

        <!-- Status Card -->
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-blue-600">Estado del Sistema</p>
              <p class="text-lg font-semibold text-blue-700">
                {expiredTokensCount === 0 ? 'Limpio' : 'Requiere Limpieza'}
              </p>
            </div>
            <div class="text-blue-500">
              <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
            </div>
          </div>
          {#if lastCleaned}
            <p class="text-xs text-blue-500 mt-1">Última limpieza: {lastCleaned}</p>
          {/if}
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-4">
        <button
          class="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg 
                 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          on:click={checkExpiredTokens}
          disabled={loading}
        >
          {#if loading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Verificando...
          {:else}
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Verificar Tokens Vencidos
          {/if}
        </button>

        <button
          class="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg 
                 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          on:click={cleanupExpiredTokens}
          disabled={cleanupLoading || expiredTokensCount === 0}
        >
          {#if cleanupLoading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Limpiando...
          {:else}
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            Limpiar Tokens Vencidos
          {/if}
        </button>
      </div>
    </div>

    <!-- Information Card -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-xl font-semibold mb-4">Información del Sistema</h2>
      <div class="space-y-3 text-sm text-gray-600">
        <div class="flex items-start">
          <div class="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
          <p><strong>Tokens Vencidos:</strong> Son tokens de autenticación que ya han expirado naturalmente pero siguen almacenados en la base de datos.</p>
        </div>
        <div class="flex items-start">
          <div class="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
          <p><strong>Limpieza Automática:</strong> Los tokens vencidos se pueden eliminar de forma segura ya que no afectan la funcionalidad del sistema.</p>
        </div>
        <div class="flex items-start">
          <div class="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3"></div>
          <p><strong>Recomendación:</strong> Ejecute la limpieza periódicamente para mantener un buen rendimiento de la base de datos.</p>
        </div>
      </div>
    </div>
  </div>
</div>