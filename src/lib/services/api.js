import { inventoryStore } from '../stores/inventory';

// Helper function for API calls
async function apiCall(url, options = {}) {
    try {
        inventoryStore.setLoading(true);
        inventoryStore.setError(null);
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        const data = await response.json();

        // Return the complete response data
        return {
            status: response.ok ? 'success' : 'error',
            data: data.data || [],
            error: data.error || null,
            message: data.message || ''
        };
    } catch (error) {
        inventoryStore.setError(error.message);
        throw error;
    } finally {
        inventoryStore.setLoading(false);
    }
}

export const inventoryAPI = {
    async fetchBodegas() {
        const data = await apiCall('/api/bodegas');
        if (data.status === 'success') {
            inventoryStore.setBodegas(data.data);
        }
        return data;
    },

    async fetchMarcas(bodega) {
        if (!bodega) return;
        const data = await apiCall(`/api/marcas?bodega=${encodeURIComponent(bodega)}`);
        if (data.status === 'success') {
            inventoryStore.setMarcas(data.data);
        }
        return data;
    },

    async fetchCategoriasIncidencias() {
        const data = await apiCall('/api/db/categorias-incidencias');
        if (data.status === 'success') {
            inventoryStore.setCategorias(data.data.map(item => item.categoria));
        }
        return data;
    },

    async fetchProductDetails(selectedBodega, selectedMarca, codigoBarras) {
        try {
            const data = await apiCall(
                `/api/producto?bodega=${encodeURIComponent(selectedBodega)}&marca=${selectedMarca}&codigo_barras=${codigoBarras}`
            );
            
            if (data.status === 'success' && data.data?.length > 0) {
                inventoryStore.setCurrentProduct(data.data[0]);
            }
            return data;
        } catch (error) {
            // Only set error for actual API failures
            if (error.message !== 'not_found') {
                inventoryStore.setError(error.message);
            }
            return {
                status: 'not_found',
                message: 'Producto no encontrado'
            };
        }
    },

    async saveProduct(formData) {
        return await apiCall('/api/producto', {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
    }
};