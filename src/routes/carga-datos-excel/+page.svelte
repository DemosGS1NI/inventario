<!-- src/routes/carga-datos-excel/+page.svelte -->
<script>
    import { onDestroy } from 'svelte';
    import BacktoMenu from '$lib/BackToMenu.svelte';
    import { addToast } from '$lib/stores/toast';
  
    let file = null;
    let isLoading = false;
    let validationResults = null;
    let showValidationErrors = false;
    let showTableNotEmpty = false;
    let existingRecordCount = 0;
  
    const uploadFile = async () => {
        if (!file) {
            addToast('Por favor seleccione un archivo.', 'error');
            return;
        }
  
        isLoading = true;
        validationResults = null;
        showValidationErrors = false;
  
        try {
            const formData = new FormData();
            formData.append('file', file);
  
            const response = await fetch('/api/carga-datos-excel', {
                method: 'POST',
                body: formData,
            });
  
            const result = await response.json();
            console.log('Server response:', result); // Debug log
  
            if (response.ok) {
                // Complete success
                const summary = result.data.summary;
                addToast(`¡Importación completada! ${summary.validRows} registros importados exitosamente.`, 'success');
                
                // Show warnings if any
                if (summary.warnings && summary.warnings.length > 0) {
                    addToast(`Se procesaron ${summary.warnings.length} advertencias menores.`, 'warning');
                }
                
                // Clear the file input after success
                file = null;
                document.getElementById('file-input').value = '';
                
            } else {
                // Validation failed or other error
                console.log('Error response:', result); // Debug log
                
                if (result.error?.code === 'TABLE_NOT_EMPTY') {
                    // Table contains existing data - need to clean first
                    const details = result.error?.details;
                    showTableNotEmptyModal(details?.existingRecordCount || 0);
                    
                } else if (result.error?.code === 'VALIDATION_FAILED') {
                    // The validation data is in error.details based on errorResponse structure
                    const validationData = result.error?.details;
                    
                    console.log('Validation data:', validationData); // Debug log
                    
                    if (validationData && validationData.invalidRecords) {
                        validationResults = validationData;
                        showValidationErrors = true;
                        addToast(`Validación falló: ${validationData.invalidRecords.length} errores encontrados. El archivo NO fue importado.`, 'error');
                    } else {
                        console.error('Validation data not found:', result);
                        addToast('Error de validación, pero no se pudieron cargar los detalles.', 'error');
                    }
                } else {
                    handleImportError(result);
                }
            }
        } catch (error) {
            console.error('Error al cargar archivo:', error);
            addToast('Ha ocurrido un error al cargar el archivo. Por favor intente nuevamente.', 'error');
        } finally {
            isLoading = false;
        }
    };

    function handleImportError(result) {
        let errorMessage = 'Error al procesar el archivo';
        
        if (result.error) {
            if (typeof result.error === 'string') {
                errorMessage = result.error;
            } else if (typeof result.error === 'object' && result.error.message) {
                errorMessage = result.error.message;
            }
        } else if (result.message) {
            errorMessage = result.message;
        }
        
        addToast(errorMessage, 'error');
    }

    function closeValidationResults() {
        showValidationErrors = false;
        validationResults = null;
    }

    function exportValidationErrors() {
        if (!validationResults?.invalidRecords || !Array.isArray(validationResults.invalidRecords)) {
            addToast('No hay errores de validación para exportar', 'warning');
            return;
        }
        
        // Create CSV content
        let csvContent = "Fila,Error\n";
        validationResults.invalidRecords.forEach(record => {
            if (record.errors && Array.isArray(record.errors)) {
                record.errors.forEach(error => {
                    csvContent += `"${record.rowNumber}","${error.replace(/"/g, '""')}"\n`;
                });
            } else {
                csvContent += `"${record.rowNumber}","Error no especificado"\n`;
            }
        });
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `errores_validacion_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addToast('Archivo de errores exportado', 'success');
    }

    function showTableNotEmptyModal(recordCount) {
        existingRecordCount = recordCount;
        showTableNotEmpty = true;
        addToast(`La tabla contiene ${recordCount} registros existentes. Debe limpiarla primero.`, 'warning');
    }

    function closeTableNotEmptyModal() {
        showTableNotEmpty = false;
        existingRecordCount = 0;
    }

    // Clean up file input reference
    onDestroy(() => {
        file = null;
    });
</script>
  
<div class="min-h-screen bg-gray-100 flex flex-col items-center px-4 py-6">
    <h1 class="text-2xl font-bold text-center mb-6">Carga Datos Desde Archivo Excel</h1>
    
    <BacktoMenu />
  
    <div class="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl mb-6">
        <!-- Important Notice -->
        <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex items-start">
                <svg class="w-6 h-6 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                <div>
                    <h3 class="text-lg font-semibold text-red-800 mb-2">¡Atención!</h3>
                    <p class="text-red-700 leading-relaxed">
                        Esta operación empezará un <strong>NUEVO ejercicio de toma de inventario</strong>. 
                        Si tiene información de un ejercicio anterior, favor <strong>Exporte la información</strong> 
                        antes de proceder con esta carga de datos.
                    </p>
                </div>
            </div>
        </div>

        <!-- Excel Structure Reference -->
        <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 class="text-lg font-semibold text-blue-800 mb-3">Estructura Requerida del Archivo Excel</h3>
            <p class="text-blue-700 text-sm mb-3">
                El archivo debe contener las siguientes columnas (exactamente con estos nombres):
            </p>
            
            <div class="overflow-x-auto">
                <table class="min-w-full text-xs border border-blue-200 rounded">
                    <thead class="bg-blue-100">
                        <tr>
                            <th class="px-3 py-2 text-left text-blue-800 font-medium border-r border-blue-200">Columna</th>
                            <th class="px-3 py-2 text-left text-blue-800 font-medium">Descripción</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white text-blue-700">
                        <tr class="border-t border-blue-200">
                            <td class="px-3 py-2 font-mono text-xs border-r border-blue-200 bg-blue-25">id</td>
                            <td class="px-3 py-2">Número entero único positivo</td>
                        </tr>
                        <tr class="border-t border-blue-200">
                            <td class="px-3 py-2 font-mono text-xs border-r border-blue-200 bg-blue-25">codigo_barras</td>
                            <td class="px-3 py-2">Código de barras del producto</td>
                        </tr>
                        <tr class="border-t border-blue-200">
                            <td class="px-3 py-2 font-mono text-xs border-r border-blue-200 bg-blue-25">bodega</td>
                            <td class="px-3 py-2">Nombre de la bodega</td>
                        </tr>
                        <tr class="border-t border-blue-200">
                            <td class="px-3 py-2 font-mono text-xs border-r border-blue-200 bg-blue-25">gtin</td>
                            <td class="px-3 py-2">GTIN del producto</td>
                        </tr>
                        <tr class="border-t border-blue-200">
                            <td class="px-3 py-2 font-mono text-xs border-r border-blue-200 bg-blue-25">ubicacion</td>
                            <td class="px-3 py-2">Ubicación dentro de la bodega</td>
                        </tr>
                        <tr class="border-t border-blue-200">
                            <td class="px-3 py-2 font-mono text-xs border-r border-blue-200 bg-blue-25">marca</td>
                            <td class="px-3 py-2">Marca del producto</td>
                        </tr>
                        <tr class="border-t border-blue-200">
                            <td class="px-3 py-2 font-mono text-xs border-r border-blue-200 bg-blue-25">numero_parte</td>
                            <td class="px-3 py-2">Número de parte del producto</td>
                        </tr>
                        <tr class="border-t border-blue-200">
                            <td class="px-3 py-2 font-mono text-xs border-r border-blue-200 bg-blue-25">descripcion</td>
                            <td class="px-3 py-2">Descripción del producto</td>
                        </tr>
                        <tr class="border-t border-blue-200">
                            <td class="px-3 py-2 font-mono text-xs border-r border-blue-200 bg-blue-25">inventario_sistema</td>
                            <td class="px-3 py-2">Cantidad en sistema (número)</td>
                        </tr>
                        <tr class="border-t border-blue-200">
                            <td class="px-3 py-2 font-mono text-xs border-r border-blue-200 bg-blue-25">single_item_ean13</td>
                            <td class="px-3 py-2">EAN13 unidad (máx 20 caracteres)</td>
                        </tr>
                        <tr class="border-t border-blue-200">
                            <td class="px-3 py-2 font-mono text-xs border-r border-blue-200 bg-blue-25">master_carton_ean13</td>
                            <td class="px-3 py-2">EAN13 caja master (máx 20 caracteres)</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

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

        <!-- File info -->
        {#if file}
            <div class="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">
                <p><strong>Archivo:</strong> {file.name}</p>
                <p><strong>Tamaño:</strong> {(file.size / 1024).toFixed(1)} KB</p>
                <p><strong>Última modificación:</strong> {new Date(file.lastModified).toLocaleDateString()}</p>
            </div>
        {/if}
  
        <button
            on:click={uploadFile}
            disabled={isLoading || !file}
            class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
        >
            {#if isLoading}
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Validando y Procesando...
            {:else}
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                Importar Datos
            {/if}
        </button>

        <p class="text-xs text-gray-500 mt-2 text-center">
            El proceso validará primero todos los datos antes de realizar cualquier cambio
        </p>
    </div>

    <!-- Validation Errors Modal -->
    {#if showValidationErrors && validationResults}
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                <!-- Header -->
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-red-50">
                    <div>
                        <h3 class="text-lg font-semibold text-red-800">Errores de Validación</h3>
                        <p class="text-sm text-red-600">El archivo NO fue importado debido a errores de validación</p>
                    </div>
                    <button 
                        on:click={closeValidationResults}
                        class="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Cerrar ventana de errores de validación"
                    >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Content -->
                <div class="px-6 py-4 overflow-y-auto max-h-[60vh]">
                    <!-- Summary Stats -->
                    <div class="grid grid-cols-3 gap-4 mb-6">
                        <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div class="text-2xl font-bold text-gray-700">{validationResults.summary.totalRows}</div>
                            <div class="text-sm text-gray-600">Total Filas</div>
                        </div>
                        
                        <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div class="text-2xl font-bold text-green-700">{validationResults.summary.validRows}</div>
                            <div class="text-sm text-green-600">Filas Válidas</div>
                        </div>
                        
                        <div class="bg-red-50 p-4 rounded-lg border border-red-200">
                            <div class="text-2xl font-bold text-red-700">{validationResults.summary.invalidRows}</div>
                            <div class="text-sm text-red-600">Filas con Errores</div>
                        </div>
                    </div>

                    <!-- Warnings -->
                    {#if validationResults.summary.warnings?.length > 0}
                        <div class="mb-6">
                            <h4 class="font-semibold text-yellow-700 mb-2">Advertencias (No bloquean la importación)</h4>
                            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-32 overflow-y-auto">
                                {#each validationResults.summary.warnings as warning}
                                    <p class="text-sm text-yellow-700 mb-1">⚠️ {warning}</p>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <!-- Validation Errors -->
                    <div class="mb-6">
                        <h4 class="font-semibold text-red-700 mb-2">Errores que Deben Corregirse</h4>
                        
                        <div class="bg-red-50 border border-red-200 rounded-lg max-h-64 overflow-y-auto">
                            {#if validationResults.invalidRecords && validationResults.invalidRecords.length > 0}
                                {#each validationResults.invalidRecords as record}
                                    <div class="p-3 border-b border-red-200 last:border-b-0">
                                        <p class="font-medium text-red-700 text-sm">Fila {record.rowNumber}:</p>
                                        {#if record.errors && record.errors.length > 0}
                                            {#each record.errors as error}
                                                <p class="text-xs text-red-600 ml-4 mt-1">• {error}</p>
                                            {/each}
                                        {:else}
                                            <p class="text-xs text-red-600 ml-4 mt-1">• Error no especificado</p>
                                        {/if}
                                        
                                        <!-- Show some data context -->
                                        {#if record.data && (record.data.id || record.data.codigo_barras)}
                                            <p class="text-xs text-gray-500 ml-4 mt-1">
                                                Contexto: 
                                                {#if record.data.id}ID: {record.data.id}{/if}
                                                {#if record.data.codigo_barras}{record.data.id ? ', ' : ''}Código: {record.data.codigo_barras}{/if}
                                            </p>
                                        {/if}
                                    </div>
                                {/each}
                            {:else}
                                <div class="p-4 text-center text-red-600">
                                    <p>Se detectaron errores de validación, pero no se pudieron cargar los detalles.</p>
                                    <p class="text-xs mt-2">Revise la consola del navegador para más información.</p>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Instructions -->
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 class="font-semibold text-blue-700 mb-2">Instrucciones para Corregir</h4>
                        <ul class="text-sm text-blue-700 space-y-1">
                            <li>• Corrija los errores listados arriba en su archivo Excel</li>
                            <li>• Todos los errores deben corregirse antes de que el archivo pueda ser importado</li>
                            <li>• Una vez corregido, vuelva a intentar la importación</li>
                        </ul>
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-6 py-4 border-t border-gray-200 flex justify-end">
                    <button 
                        on:click={closeValidationResults}
                        class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- Table Not Empty Modal -->
    {#if showTableNotEmpty}
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
                <!-- Header -->
                <div class="px-6 py-4 border-b border-gray-200 bg-yellow-50">
                    <div class="flex items-center">
                        <svg class="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                        <h3 class="text-lg font-semibold text-yellow-800">Tabla de Inventario No Está Vacía</h3>
                    </div>
                </div>

                <!-- Content -->
                <div class="px-6 py-4">
                    <div class="mb-4">
                        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                            <p class="text-yellow-800 font-medium mb-2">
                                Se encontraron <span class="font-bold">{existingRecordCount}</span> registros existentes en la tabla de inventario.
                            </p>
                            <p class="text-yellow-700 text-sm">
                                Para importar nuevos datos, primero debe limpiar la tabla de inventario existente usando la opción "Limpieza de Tablas" en el menú de Administración.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-6 py-4 border-t border-gray-200 flex justify-center">
                    <button 
                        on:click={closeTableNotEmptyModal}
                        class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>