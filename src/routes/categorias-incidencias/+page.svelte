<script>
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
  
    let categories = writable([]);
    let isEditing = false;
    let formData = { id: null, categoria: '', descripcion: '' };
  
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categorias-incidencias');
        const data = await res.json();
        if (res.ok) categories.set(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    }
  
    async function saveCategory() {
      const method = isEditing ? 'PUT' : 'POST';
      const endpoint = '/api/categorias-incidencias';
  
      try {
        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
  
        if (!res.ok) throw new Error('Error saving category');
  
        fetchCategories();
        resetForm();
      } catch (error) {
        console.error('Error saving category:', error);
      }
    }
  
    async function deleteCategory(id) {
      if (!confirm('Are you sure you want to delete this category?')) return;
  
      try {
        const res = await fetch('/api/categorias-incidencias', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
  
        if (!res.ok) throw new Error('Error deleting category');
  
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  
    function editCategory(category) {
      isEditing = true;
      formData = { ...category };
    }
  
    function resetForm() {
      isEditing = false;
      formData = { id: null, categoria: '', descripcion: '' };
    }
  
    onMount(fetchCategories);
  </script>
  
  <div class="p-6 bg-gray-100 min-h-screen">
    <h1 class="text-3xl font-bold mb-6">Categorías de Incidencias</h1>
  
    <!-- Form -->
    <form on:submit|preventDefault={saveCategory} class="bg-white p-4 rounded shadow mb-6">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="block text-sm font-medium">Categoría</label>
          <input
            type="text"
            bind:value={formData.categoria}
            required
            class="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label class="block text-sm font-medium">Descripción</label>
          <input
            type="text"
            bind:value={formData.descripcion}
            class="w-full p-2 border rounded"
          />
        </div>
      </div>
      <div class="flex justify-end mt-4">
        <button type="button" on:click={resetForm} class="bg-gray-500 text-white px-4 py-2 rounded mr-2">
          Cancel
        </button>
        <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">
          {isEditing ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  
    <!-- Categories Table -->
    <div class="overflow-x-auto bg-white shadow rounded">
      <table class="table-auto w-full">
        <thead class="bg-blue-100">
          <tr>
            <th class="p-3">ID</th>
            <th class="p-3">Categoría</th>
            <th class="p-3">Descripción</th>
            <th class="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if $categories.length > 0}
            {#each $categories as category}
              <tr class="hover:bg-gray-100">
                <td class="p-3 border">{category.id}</td>
                <td class="p-3 border">{category.categoria}</td>
                <td class="p-3 border">{category.descripcion}</td>
                <td class="p-3 border">
                  <button on:click={() => editCategory(category)} class="bg-blue-500 text-white px-4 py-2 rounded">
                    Edit
                  </button>
                  <button on:click={() => deleteCategory(category.id)} class="bg-red-500 text-white px-4 py-2 rounded ml-2">
                    Delete
                  </button>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="4" class="p-3 text-center text-gray-500">No categories found.</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
  