import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { inventoryStore } from './inventory';

describe('inventoryStore', () => {
    beforeEach(() => {
        // Reset the store before each test
        inventoryStore.reset();
    });

    it('should initialize with default values', () => {
        const state = get(inventoryStore);
        expect(state).toEqual({
            bodegas: [],
            marcas: [],
            categoriasIncidencias: [],
            loading: false,
            error: null,
            selectedBodega: '',
            selectedMarca: '',
            ubicacion: '',
            currentProduct: null
        });
    });

    it('should update bodegas', () => {
        const testBodegas = ['BODEGA #1', 'BODEGA #2'];
        inventoryStore.setBodegas(testBodegas);
        const state = get(inventoryStore);
        expect(state.bodegas).toEqual(testBodegas);
    });

    it('should clear related fields when changing bodega', () => {
        // Setup initial state
        inventoryStore.setMarcas(['MARCA1', 'MARCA2']);
        inventoryStore.setSelectedMarca('MARCA1');
        inventoryStore.setUbicacion('A1-B2');
        
        // Change bodega
        inventoryStore.setSelectedBodega('BODEGA #1');
        
        // Check if related fields are cleared
        const state = get(inventoryStore);
        expect(state).toMatchObject({
            selectedBodega: 'BODEGA #1',
            selectedMarca: '',
            marcas: [],
            ubicacion: '',
            currentProduct: null
        });
    });

    it('should handle loading state', () => {
        inventoryStore.setLoading(true);
        let state = get(inventoryStore);
        expect(state.loading).toBe(true);

        inventoryStore.setLoading(false);
        state = get(inventoryStore);
        expect(state.loading).toBe(false);
    });
});