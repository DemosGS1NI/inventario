<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import BackToMenuButton from '$lib/BackToMenu.svelte'; // Reusable back-to-menu button

  let categories = writable([]);
  let isEditing = false;
  let formData = { id: null, categoria: '', descripcion: '' };

  async function fetchCategories() {
    try {
      const res = await fetch('/api/db/categorias-incidencias');
      const data = await res.json();
      if (res.ok) categories.set(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  async function saveCategory() {
    const method = isEditing ? 'PUT' : 'POST';
    const endpoint = '/api/db/categorias-incidencias';

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
      const res = await fetch('/api/db/categorias-incidencias', {
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

<div class="p-6 bg-gray-100 min-h-screen flex flex-col">
  <!-- Title -->
  <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">
    Categorías de Incidencias
  </h1>

  <!-- Back to Menu Button -->
  <div class="mb-6">
    <BackToMenuButton />
  </div>

  <!-- Form -->
  <form
    on:submit|preventDefault={saveCategory}
    class="bg-white p-6 rounded shadow-md mb-6"
  >
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label class="block text-sm font-medium text-gray-700">Categoría</label>
        <input
          type="text"
          bind:value={formData.categoria}
          required
          class="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Descripción</label>
        <input
          type="text"
          bind:value={formData.descripcion}
          class="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary"
        />
      </div>
    </div>
    <div class="flex justify-end mt-4">
      <button
        type="button"
        on:click={resetForm}
        class="bg-secondary hover:bg-secondary-hover text-white px-4 py-2 rounded mr-2"
      >
        Cancelar
      </button>
      <button
        type="submit"
        class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded"
      >
        {isEditing ? 'Actualizar' : 'Crear'}
      </button>
    </div>
  </form>

  <!-- Categories Table -->
  <div class="overflow-x-auto bg-white shadow-md rounded">
    <table class="table-auto w-full border-collapse">
      <thead class="bg-gray-200 text-gray-700">
        <tr>
          <th class="p-3 border">ID</th>
          <th class="p-3 border">Categoría</th>
          <th class="p-3 border">Descripción</th>
          <th class="p-3 border">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#if $categories.length > 0}
          {#each $categories as category}
            <tr class="hover:bg-gray-50">
              <td class="p-3 border">{category.id}</td>
              <td class="p-3 border">{category.categoria}</td>
              <td class="p-3 border">{category.descripcion}</td>
              <td class="p-3 border flex space-x-2">
                <button
                  on:click={() => editCategory(category)}
                  class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Editar
                </button>
                <button
                  on:click={() => deleteCategory(category.id)}
                  class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          {/each}
        {:else}
          <tr>
            <td colspan="4" class="p-3 text-center text-gray-500">
              No se encontraron categorías.
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
