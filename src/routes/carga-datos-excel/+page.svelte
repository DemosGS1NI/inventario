<script>
    import { onDestroy } from 'svelte';
    import BacktoMenu from '$lib/BackToMenu.svelte';
    import { addToast } from '$lib/stores/toast'; // ADD THIS IMPORT
  
    let file = null;
    let isLoading = false;
  
    const uploadFile = async () => {
        if (!file) {
            addToast('Por favor seleccione un archivo.', 'error');
            return;
        }
  
        isLoading = true;
  
        try {
            const formData = new FormData();
            formData.append('file', file);
  
            const response = await fetch('/api/upload-excel', {
                method: 'POST',
                body: formData,
            });
  
            const result = await response.json();
  
            if (response.ok) {
                addToast('Datos cargados exitosamente en la base de datos', 'success');
                // Clear the file input after success
                file = null;
                document.getElementById('file-input').value = '';
            } else {
                // Handle different types of error responses
                let errorMessage = 'Error al procesar el archivo';
                
                if (result.error) {
                    // If error is a string, use it directly
                    if (typeof result.error === 'string') {
                        errorMessage = result.error;
                    } 
                    // If error is an object, extract the message
                    else if (typeof result.error === 'object' && result.error.message) {
                        errorMessage = result.error.message;
                    }
                    // If we have details, append them
                    if (result.details) {
                        errorMessage += `\n\nDetalles: ${result.details}`;
                    }
                } else if (result.message) {
                    // Fallback to message field
                    errorMessage = result.message;
                }
                
                addToast(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Error al cargar archivo:', error);
            addToast('Ha ocurrido un error al cargar el archivo. Por favor intente nuevamente.', 'error');
        } finally {
            isLoading = false;
        }
    };

    // Clean up file input reference
    onDestroy(() => {
        file = null;
    });
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
            class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
            {#if isLoading}
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cargando...
            {:else}
                Subir Archivo
            {/if}
        </button>
    </div>
</div>