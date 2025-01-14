// src/lib/stores/inventory.js
import { writable } from 'svelte/store';

const initialState = {
    bodegas: [],
    marcas: [],
    categoriasIncidencias: [],
    loading: false,
    error: null,
    selectedBodega: '',
    selectedMarca: '',
    ubicacion: '',
    currentProduct: null
};

function createInventoryStore() {
    const { subscribe, set, update } = writable(initialState);

    return {
        subscribe,
        setBodegas: (bodegas) => update(state => ({ ...state, bodegas })),
        setMarcas: (marcas) => update(state => ({ ...state, marcas })),
        setCategorias: (categorias) => update(state => ({ ...state, categoriasIncidencias: categorias })),
        setLoading: (loading) => update(state => ({ ...state, loading })),
        setError: (error) => update(state => ({ ...state, error })),
        setSelectedBodega: (bodega) => update(state => {
            // Reset related fields when bodega changes
            return { 
                ...state, 
                selectedBodega: bodega,
                selectedMarca: '',
                marcas: [],
                ubicacion: '',
                currentProduct: null 
            };
        }),
        setSelectedMarca: (marca) => update(state => {
            // Reset location and product when marca changes
            return { 
                ...state, 
                selectedMarca: marca,
                ubicacion: '',
                currentProduct: null 
            };
        }),
        setUbicacion: (ubicacion) => update(state => ({ ...state, ubicacion })),
        setCurrentProduct: (product) => update(state => ({ ...state, currentProduct: product })),
        resetProduct: () => update(state => ({ ...state, currentProduct: null })),
        resetLocation: () => update(state => ({ 
            ...state, 
            ubicacion: '', 
            currentProduct: null 
        })),
        reset: () => {
            set(initialState);
            return initialState;
        }
    };
}
export const inventoryStore = createInventoryStore();