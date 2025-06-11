import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'adminInventorySelections';

const initialState = {
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
	isFullscreen: false,
	// New progress tracking data
	progressData: {
		overallExercise: {
			totalProducts: 0,
			countedProducts: 0,
			validatedProducts: 0,
			percentageCounted: 0,
			percentageValidated: 0
		},
		currentView: null,
		summary: {
			totalBodegas: 0,
			totalUbicaciones: 0,
			totalLocations: 0,
			pendingValidation: 0
		},
		lastUpdated: null
	}
};

function getInitialState() {
	console.log('AdminInventory Store: Getting initial state');

	// Only try to access localStorage in browser environment
	if (browser) {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				console.log('AdminInventory Store: Found stored state:', stored);
				const { selectedBodega, selectedMarca, selectedUbicacion } = JSON.parse(stored);
				return {
					...initialState,
					selectedBodega: selectedBodega || '',
					selectedMarca: selectedMarca || '',
					selectedUbicacion: selectedUbicacion || ''
				};
			}
		} catch (error) {
			console.error('AdminInventory Store: Error loading stored selections:', error);
		}
	}

	console.log('AdminInventory Store: Using default state');
	return initialState;
}

function createAdminInventoryStore() {
	const { subscribe, set, update } = writable(getInitialState());

	return {
		subscribe,
		setSelections: (bodega, marca, ubicacion) => {
			console.log('AdminInventory Store: Setting selections:', { bodega, marca, ubicacion });
			update((state) => {
				const newState = {
					...state,
					selectedBodega: bodega,
					selectedMarca: marca,
					selectedUbicacion: ubicacion
				};
				// Only try to access localStorage in browser environment
				if (browser) {
					localStorage.setItem(
						STORAGE_KEY,
						JSON.stringify({
							selectedBodega: bodega,
							selectedMarca: marca,
							selectedUbicacion: ubicacion
						})
					);
				}
				return newState;
			});
		},
		setLoading: (loading) => {
			console.log('AdminInventory Store: Setting loading:', loading);
			update((state) => ({ ...state, loading }));
		},
		setError: (error) => {
			console.log('AdminInventory Store: Setting error:', error);
			update((state) => ({ ...state, error }));
		},
		setBodegas: (bodegas) => {
			console.log('AdminInventory Store: Setting bodegas:', bodegas);
			update((state) => ({ ...state, bodegas }));
		},
		setMarcas: (marcas) => {
			console.log('AdminInventory Store: Setting marcas:', marcas);
			update((state) => ({ ...state, marcas }));
		},
		setUbicaciones: (ubicaciones) => {
			console.log('AdminInventory Store: Setting ubicaciones:', ubicaciones);
			update((state) => ({ ...state, ubicaciones }));
		},
		setRecords: (records) => {
			console.log('AdminInventory Store: Setting records:', records);
			update((state) => ({
				...state,
				records,
				lastUpdated: new Date().toLocaleString()
			}));
		},
		// New method for setting progress data
		setProgressData: (progressData) => {
			console.log('AdminInventory Store: Setting progress data:', progressData);
			update((state) => ({
				...state,
				progressData: {
					...state.progressData,
					...progressData
				}
			}));
		},
		toggleFullscreen: () => {
			console.log('AdminInventory Store: Toggling fullscreen');
			update((state) => ({
				...state,
				isFullscreen: !state.isFullscreen
			}));
		},
		reset: () => {
			console.log('AdminInventory Store: Resetting store');
			if (browser) {
				localStorage.removeItem(STORAGE_KEY);
			}
			set(initialState);
		}
	};
}

export const adminInventoryStore = createAdminInventoryStore();