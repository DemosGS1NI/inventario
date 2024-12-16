<script>
    import { onMount } from 'svelte';
    import BackToMenuButton from '$lib/BackToMenu.svelte';
  
    let warehouses = [];
    let brands = [];
    let locations = [];
    let selectedWarehouse = null;
    let selectedBrand = null;
    let selectedLocation = null;
    let inventoryRecords = [];
    let message = '';
  
    // Fetch warehouses
    const fetchWarehouses = async () => {
      try {
        const res = await fetch('/api/bodegas');
        const response = await res.json();
        warehouses = response.bodegas || [];
      } catch (error) {
        console.error('Error fetching warehouses:', error);
      }
    };
  
    // Fetch brands based on selected warehouse
    const fetchBrands = async () => {
      if (!selectedWarehouse) return;
  
      try {
        const res = await fetch(`/api/marcas?bodega=${selectedWarehouse}`);
        const response = await res.json();
        brands = response.marcas || [];
      } catch (error) {
        console.error('Error fetching brands:', error);
      }
    };
  
    // Fetch locations based on selected warehouse and brand
    const fetchLocations = async () => {
      if (!selectedWarehouse || !selectedBrand) return;
  
      try {
        const res = await fetch(`/api/locations?warehouse=${selectedWarehouse}&brand=${selectedBrand}`);
        const response = await res.json();
        locations = response.locations || [];
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };
  
    // Fetch inventory records
    const fetchInventoryRecords = async () => {
      if (!selectedWarehouse || !selectedBrand || !selectedLocation) {
        message = 'Seleccione todos los filtros para ver los registros.';
        return;
      }
  
      try {
        const res = await fetch(
          `/api/db/inventory-records?warehouse=${selectedWarehouse}&brand=${selectedBrand}&location=${selectedLocation}`
        );
        inventoryRecords = await res.json();
      } catch (error) {
        console.error('Error fetching inventory records:', error);
        message = 'Error al cargar los registros de inventario.';
      }
    };
  
    // Load warehouses and brands on mount
    onMount(async () => {
      await fetchWarehouses();
    });
  </script>
  
  <!-- Filters -->
  <div class="flex flex-wrap justify-between items-center mb-6 space-y-4 md:space-y-0">
    <div class="w-full md:w-1/3 px-2">
      <label for="warehouse" class="block text-gray-700 text-sm font-medium">Bodega</label>
      <select
        id="warehouse"
        bind:value={selectedWarehouse}
        on:change={fetchBrands}
        class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
      >
        <option value="" disabled selected>Seleccione una bodega</option>
        {#each warehouses as warehouse}
          <option value={warehouse}>{warehouse}</option>
        {/each}
      </select>
    </div>
  
    <div class="w-full md:w-1/3 px-2">
      <label for="brand" class="block text-gray-700 text-sm font-medium">Marca</label>
      <select
        id="brand"
        bind:value={selectedBrand}
        on:change={fetchLocations}
        class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
      >
        <option value="" disabled selected>Seleccione una marca</option>
        {#each brands as brand}
          <option value={brand}>{brand}</option>
        {/each}
      </select>
    </div>
  
    <div class="w-full md:w-1/3 px-2">
      <label for="location" class="block text-gray-700 text-sm font-medium">Ubicación</label>
      <select
        id="location"
        bind:value={selectedLocation}
        class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
      >
        <option value="" disabled selected>Seleccione una ubicación</option>
        {#each locations as location}
          <option value={location.ubicacion}>{location.ubicacion}</option>
        {/each}
      </select>
    </div>
  </div>
  
  <div class="flex justify-center mb-6">
    <button
      class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded font-bold"
      on:click={fetchInventoryRecords}
    >
      Buscar Registros
    </button>
  </div>
  