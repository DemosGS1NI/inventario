<script>
  import BackToMenuButton from '$lib/BackToMenu.svelte';
  import { addToast } from '$lib/stores/toast';
  
  let isDownloading = false;

  async function downloadExcel() {
      if (isDownloading) return; // Prevent multiple clicks
      
      isDownloading = true;
      
      try {
          const response = await fetch('/api/download-excel');

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Error downloading the Excel file.');
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          // Get current date and time for filename
          const now = new Date();
          const dateStr = now.toISOString().split('T')[0];
          const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
          const defaultFilename = `comersa_output_${dateStr}_${timeStr}.xlsx`;

          const filename = response.headers.get('Content-Disposition')?.split('filename=')[1] || defaultFilename;

          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();

          // Cleanup
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          addToast('Archivo descargado exitosamente', 'success');
      } catch (error) {
          console.error('Error downloading Excel:', error);
          addToast('Error al descargar el archivo. Por favor intente nuevamente.', 'error');
      } finally {
          isDownloading = false;
      }
  }
</script>

<div class="min-h-screen bg-gray-100 flex flex-col items-center py-8">
  <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
      <h1 class="text-2xl font-bold mb-6 text-center text-gray-800">Descargar Datos Excel</h1>

      <div class="mb-6">
          <BackToMenuButton />
      </div>

      <div class="space-y-4 mb-8">
          <div class="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h2 class="font-semibold text-blue-800 mb-2">Información Importante</h2>
              <ul class="text-blue-700 space-y-2">
                  <li>• El archivo se generará en formato Excel (.xlsx)</li>
                  <li>• Contiene toda la información actualizada de la base de datos</li>
                  <li>• El nombre del archivo incluirá la fecha y hora de descarga</li>
              </ul>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p class="text-sm text-gray-600 mb-2">Formato del nombre del archivo:</p>
              <code class="block bg-white p-2 rounded border border-gray-300 text-gray-700 text-sm">
                  comersa_output_YYYY-MM-DD_HH-MM-SS.xlsx
              </code>
          </div>
      </div>

      <button
          on:click={downloadExcel}
          disabled={isDownloading}
          class="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center space-x-2"
      >
          {#if isDownloading}
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Descargando...</span>
          {:else}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              <span>Descargar Excel</span>
          {/if}
      </button>
  </div>
</div>