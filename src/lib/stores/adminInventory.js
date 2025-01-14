import { writable } from 'svelte/store';

const STORAGE_KEY = 'adminInventorySelections';

function getInitialState() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const { selectedBodega, selectedMarca, selectedUbicacion } = JSON.parse(stored);
            return {
                bodegas: [],
                marcas: [],
                ubicaciones: [],
                records: [],
                selectedBodega: selectedBodega || '',
                selectedMarca: selectedMarca || '',
                selectedUbicacion: selectedUbicacion || '',
                loading: false,
                error: null,
                lastUpdated: null,
                isFullscreen: false
            };
        }
    } catch (error) {
        console.error('Error loading stored selections:', error);
    }
    
    return {
        bodegas: [],
        marcas: [],
        ubicaciones: [],
        records: [],
        selectedBodega: '',
        selectedMarca: '',
        selectedUbicacion: '',
        loading: false,
        error: null,
        lastUpdated: null,
        isFullscreen: false
    };
}

function createAdminInventoryStore() {
    const { subscribe, set, update } = writable(getInitialState());

    return {
        subscribe,
        setSelections: (bodega, marca, ubicacion) => update(state => {
            const newState = {
                ...state,
                selectedBodega: bodega,
                selectedMarca: marca,
                selectedUbicacion: ubicacion
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                selectedBodega: bodega,
                selectedMarca: marca,
                selectedUbicacion: ubicacion
            }));
            return newState;
        }),
        setLoading: (loading) => update(state => ({ ...state, loading })),
        setError: (error) => update(state => ({ ...state, error })),
        setBodegas: (bodegas) => update(state => ({ ...state, bodegas })),
        setMarcas: (marcas) => update(state => ({ ...state, marcas })),
        setUbicaciones: (ubicaciones) => update(state => ({ ...state, ubicaciones })),
        setRecords: (records) => update(state => ({ 
            ...state, 
            records,
            lastUpdated: new Date().toLocaleString()
        })),
        toggleFullscreen: () => update(state => ({
            ...state,
            isFullscreen: !state.isFullscreen
        })),
        reset: () => {
            localStorage.removeItem(STORAGE_KEY);
            set(getInitialState());
        }
    };
}

export const adminInventoryStore = createAdminInventoryStore();