<script>
  import { onMount } from 'svelte';
  import BackToMenuButton from '$lib/BackToMenu.svelte';
  import { addToast } from '$lib/stores/toast'; // ADD THIS IMPORT

  let categories = [];
  let currentCategory = { id: null, categoria: '', descripcion: '' };
  let showForm = false;
  // REMOVE: let message = '';
  // REMOVE: let messageType = ''; // 'success' or 'error'

  // Fetch all categories
  async function fetchCategories() {
    try {
      const res = await fetch('/api/db/categorias-incidencias');
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        categories = data.data;
        // REMOVE: message = '';
        // REMOVE: messageType = '';
      } else {
        addToast(data.message || 'Error al cargar categorías.', 'error');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      addToast('Ocurrió un error al cargar categorías.', 'error');
    }
  }

  // Save or update a category
  async function saveCategory() {
    const method = currentCategory.id ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/db/categorias-incidencias', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentCategory),
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        const successMessage = currentCategory.id
          ? 'Categoría actualizada con éxito!'
          : 'Categoría creada con éxito!';
        addToast(successMessage, 'success');
        await fetchCategories();
        resetForm();
        showForm = false;
      } else {
        addToast(data.message || 'Error al guardar la categoría.', 'error');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      addToast('Ocurrió un error al guardar la categoría.', 'error');
    }
  }

  // Delete a category
  async function deleteCategory(id) {
    if (!confirm('¿Está seguro de que desea eliminar esta categoría?')) return;

    try {
      const res = await fetch('/api/db/categorias-incidencias', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        addToast('Categoría eliminada con éxito!', 'success');
        await fetchCategories();
      } else {
        addToast(data.message || 'Error al eliminar la categoría.', 'error');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      addToast('Ocurrió un error al eliminar la categoría.', 'error');
    }
  }

  function editCategory(category) {
    currentCategory = { ...category };
    showForm = true;
  }

  function resetForm() {
    currentCategory = { id: null, categoria: '', descripcion: '' };
    showForm = false;
  }

  // REMOVE: Reset message after a delay
  // REMOVE: function resetMessage() {
  // REMOVE:   setTimeout(() => {
  // REMOVE:     message = '';
  // REMOVE:     messageType = '';
  // REMOVE:   }, 5000);
  // REMOVE: }

  // REMOVE: $: if (message) resetMessage();

  onMount(fetchCategories);
</script>

<!-- Template -->
<div class="p-6 bg-gray-100 min-h-screen">
  <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">
    Categorías de Incidencias
  </h1>

  <div class="mb-6">
    <BackToMenuButton />
  </div>

  <!-- REMOVE THIS ENTIRE MESSAGE SECTION:
  {#if message}
    <p
      class="text-center mb-4"
      class:text-green-600={messageType === 'success'}
      class:text-red-600={messageType === 'error'}
    >
      {message}
    </p>
  {/if}
  -->

  <div class="flex justify-center mb-6">
    <button
      class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded font-bold"
      on:click={() => {
        showForm = true;
        resetForm();
      }}
    >
      Agregar Categoría
    </button>
  </div>

  <!-- Form -->
  {#if showForm}
    <div class="bg-white shadow-md rounded px-8 py-6 mb-6 max-w-lg mx-auto">
      <form on:submit|preventDefault={saveCategory}>
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label for="categoria" class="block text-gray-700 text-sm font-medium">Categoría</label>
            <input
              type="text"
              id="categoria"
              bind:value={currentCategory.categoria}
              required
              class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label for="descripcion" class="block text-gray-700 text-sm font-medium">Descripción</label>
            <textarea
              id="descripcion"
              bind:value={currentCategory.descripcion}
              class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
            ></textarea>
          </div>
        </div>
        <div class="flex justify-end mt-4 space-x-4">
          <button
            type="button"
            on:click={resetForm}
            class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded font-bold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-bold"
          >
            {currentCategory.id ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  {/if}

  <!-- Table -->
  <div class="overflow-x-auto bg-white shadow-md rounded">
    <table class="table-auto w-full border-collapse">
      <thead class="bg-gray-200 text-gray-700">
        <tr>
          <th class="py-3 px-4 border">ID</th>
          <th class="py-3 px-4 border">Categoría</th>
          <th class="py-3 px-4 border">Descripción</th>
          <th class="py-3 px-4 border text-center">Acciones</th>
        </tr>
      </thead>
      <tbody class="text-gray-600">
        {#if categories.length > 0}
          {#each categories as category}
            <tr class="hover:bg-gray-50">
              <td class="py-3 px-4 border">{category.id}</td>
              <td class="py-3 px-4 border">{category.categoria}</td>
              <td class="py-3 px-4 border">{category.descripcion}</td>
              <td class="py-3 px-4 border text-center flex justify-center space-x-2">
                <button
                  class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  on:click={() => editCategory(category)}
                >
                  Editar
                </button>
                <button
                  class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  on:click={() => deleteCategory(category.id)}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          {/each}
        {:else}
          <tr>
            <td colspan="4" class="py-3 px-4 border text-center text-gray-500">
              No se encontraron categorías.
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>