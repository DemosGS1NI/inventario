<script>
    import BackToMenuButton from '$lib/BackToMenu.svelte';
  
    async function downloadExcel() {
      try {
        const response = await fetch('/api/download-excel'); // Ensure this API route exists and handles the download
  
        if (!response.ok) {
          throw new Error('Error downloading the Excel file.');
        }
  
        // Extract the file as a blob
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
  
        // Create a temporary link to trigger the download
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'comersa_output.xlsx';
        document.body.appendChild(a);
        a.click();
  
        // Cleanup
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading Excel:', error);
        alert('Failed to download the file. Please try again.');
      }
    }
  </script>
  
  <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
    <div class="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
      <h1 class="text-2xl font-bold mb-4">Descargar Datos Excel</h1>
  
      <!-- Back to Main Menu Button -->
      <div class="mb-4">
        <BackToMenuButton />
      </div>
  
      <p class="text-gray-700 mb-4">
        Al hacer clic en el botón de descarga, se generará un archivo en formato Excel con el nombre:
      </p>
      <p class="font-semibold text-gray-900 mb-4">
        <code>comersa_output_fecha_hora.xlsx</code>
      </p>
      <p class="text-gray-700 mb-4">
        El archivo contendrá toda la información almacenada en la base de datos en el momento de la descarga.
      </p>
      <button
        on:click={downloadExcel}
        class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded shadow-md"
      >
        Descargar Excel
      </button>
    </div>
  </div>
  