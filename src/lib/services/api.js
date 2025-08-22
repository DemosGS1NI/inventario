import { inventoryStore } from '../stores/inventory';

// Helper function for API calls
/**
 * Makes authenticated API calls with standardized error handling
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Object>} Standardized API response
 */
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
		const data = await apiCall('/api/inventario/fetch-bodegas');
		if (data.status === 'success') {
			inventoryStore.setBodegas(data.data);
		}
		return data;
	},

	async fetchMarcas(bodega) {
		if (!bodega) return;

		const queryParams = new URLSearchParams({
			bodega: bodega
		});

		const data = await apiCall(`/api/inventario/fetch-marcas?${queryParams.toString()}`);
		if (data.status === 'success') {
			inventoryStore.setMarcas(data.data);
		}
		return data;
	},

	/**
	 * Fetches product details by barcode from inventory
	 * @param {string} selectedBodega - The warehouse/bodega name
	 * @param {string|null} selectedMarca - The brand name (optional)
	 * @param {string} codigoBarras - The product barcode/part number
	 * @returns {Promise<Object>} Response with product data or error
	 */
	async fetchCategoriasIncidencias() {
		const data = await apiCall('/api/db/categorias-incidencias');
		if (data.status === 'success') {
			inventoryStore.setCategorias(data.data.map((item) => item.categoria));
		}
		return data;
	},

	async fetchProductDetails(selectedBodega, selectedMarca, codigoBarras) {
		try {
			// Format parameters properly
			const queryParams = new URLSearchParams({
				bodega: selectedBodega,
				codigo_barras: codigoBarras
			});

			// Only add marca if it's a valid value
			if (selectedMarca && selectedMarca !== 'null' && selectedMarca !== 'undefined') {
				queryParams.append('marca', selectedMarca);
			}

			console.log('Making API call with params:', {
				bodega: selectedBodega,
				marca: selectedMarca,
				codigo_barras: codigoBarras
			});

			// Make the API call
			const result = await apiCall(`/api/inventario/registro?${queryParams.toString()}`);
			console.log('Processed API response:', result);

			// Handle the response
			if (result.status === 'success' && result.data) {
				// Normalize the data format
				let productData = result.data;

				// If it's already an array, use the first item
				if (Array.isArray(productData) && productData.length > 0) {
					productData = productData[0];
				}

				// Store the product in the inventory store
				inventoryStore.setCurrentProduct(productData);

				// Always return in a consistent format
				return {
					status: 'success',
					data: [productData], // Always return as array with one item
					message: result.message || 'Product found'
				};
			} else {
				// No product found or error
				console.log('No product found or error:', result);
				return {
					status: 'error',
					data: [],
					error: result.error || { code: 'NOT_FOUND', message: 'Product not found' },
					message: result.message || 'Product not found'
				};
			}
		} catch (error) {
			console.error('Exception in fetchProductDetails:', error);

			inventoryStore.setError(error.message);
			return {
				status: 'error',
				data: [],
				error: { code: 'EXCEPTION', message: error.message },
				message: 'An unexpected error occurred'
			};
		}
	},

	/**
	 * Saves product changes to the inventory (unified API)
	 * @param {Object} formData - The product data to update
	 * @returns {Promise<Object>} API response
	 */
	async saveProduct(formData) {
		return await apiCall('/api/inventario/registro', {
			method: 'PUT',
			body: JSON.stringify(formData)
		});
	}
};
