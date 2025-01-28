<script>
    import BacktoMenu from '$lib/BackToMenu.svelte';
  
    let file = null;
    let isLoading = false; // Add loading state
  
    const uploadFile = async () => {
        if (!file) {
            alert('Por favor seleccione un archivo.');
            return;
        }
  
        isLoading = true; // Set loading state to true before starting upload
  
        const formData = new FormData();
        formData.append('file', file);
  
        try {
            const response = await fetch('/api/upload-excel', {
                method: 'POST',
                body: formData,
            });
  
            const result = await response.json();
  
            if (response.ok) {
                alert(result.success);
                // Optional: Clear the file input after successful upload
                file = null;
                // Optional: Clear the file input element
                document.getElementById('file-input').value = '';
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Ha ocurrido una falla al cargar el archivo.');
        } finally {
            isLoading = false; // Reset loading state whether successful or not
        }
    };
  </script>
  
  <div class="min-h-screen bg-gray-100 flex flex-col items-center px-4 py-6">
    <h1 class="text-2xl font-bold text-center mb-6">Carga Datos Desde Archivo Excel</h1>
    
    <BacktoMenu />
  
    <div class="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <label 
            for="file-input" 
            class="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar archivo (.xlsx)
        </label>
        <input
            id="file-input"
            type="file"
            accept=".xlsx"
            on:change={(e) => (file = e.target.files[0])}
            disabled={isLoading}
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
        />
  
        <button
            on:click={uploadFile}
            disabled={isLoading || !file}
            class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {#if isLoading}
                <span class="inline-flex items-center">
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cargando...
                </span>
            {:else}
                Subir Archivo
            {/if}
        </button>
    </div>
  </div>