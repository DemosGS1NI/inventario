<script>
  import { onMount } from 'svelte';
  import BackToMenuButton from '$lib/BackToMenu.svelte'; // Reusable back-to-menu button

  let roles = [];
  let currentRole = {};
  let isEditing = false;
  let showForm = false;
  let message = '';

  // Fetch roles from the database
  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/db/roles');
      if (response.ok) {
        roles = await response.json();
      } else {
        console.error('Failed to fetch roles:', response.statusText);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  // Save or update role
  const saveRole = async () => {
    const method = isEditing ? 'PUT' : 'POST';
    try {
      const response = await fetch('/api/db/roles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRole),
      });

      if (response.ok) {
        message = isEditing ? 'Rol actualizado con éxito!' : 'Rol agregado con éxito!';
        await fetchRoles();
        resetForm();
      } else {
        const data = await response.json();
        message = data.message || 'Error al guardar el rol.';
      }
    } catch (err) {
      console.error('Error saving role:', err);
      message = 'Ocurrió un error al guardar el rol.';
    }
  };

  // Edit a role
  const editRole = (role) => {
    currentRole = { ...role };
    isEditing = true;
    showForm = true;
  };

  // Delete a role
  const deleteRole = async (id) => {
    if (!confirm('¿Está seguro de que desea eliminar este rol?')) return;

    try {
      const response = await fetch(`/api/db/roles/${id}`, { method: 'DELETE' });
      if (response.ok) {
        message = 'Rol eliminado con éxito!';
        await fetchRoles();
      } else {
        const data = await response.json();
        message = data.message || 'Error al eliminar el rol.';
      }
    } catch (err) {
      console.error('Error deleting role:', err);
      message = 'Ocurrió un error al eliminar el rol.';
    }
  };

  // Reset the form
  const resetForm = () => {
    isEditing = false;
    showForm = false;
    currentRole = { nombre_rol: '', descripcion: '' };
  };

  onMount(fetchRoles);
</script>

<div class="p-6 bg-gray-100 min-h-screen flex flex-col">
  <!-- Title -->
  <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">Administración de Roles</h1>

  <!-- Back to Menu Button -->
  <div class="mb-6">
    <BackToMenuButton />
  </div>

  <!-- Message -->
  {#if message}
    <p class="text-center text-green-600 mb-4">{message}</p>
  {/if}

  <!-- Add Role Button -->
  <div class="flex justify-center mb-6">
    <button
      class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded font-bold"
      on:click={() => { showForm = true; resetForm(); }}
    >
      Agregar Rol
    </button>
  </div>

  <!-- Roles Table -->
  <div class="overflow-x-auto bg-white shadow-md rounded mb-6">
    <table class="table-auto w-full border-collapse">
      <thead class="bg-gray-200 text-gray-700">
        <tr>
          <th class="py-3 px-4 border">Nombre</th>
          <th class="py-3 px-4 border">Descripción</th>
          <th class="py-3 px-4 border text-center">Acciones</th>
        </tr>
      </thead>
      <tbody class="text-gray-600">
        {#if roles.length > 0}
          {#each roles as role}
            <tr class="hover:bg-gray-50">
              <td class="py-3 px-4 border">{role.nombre_rol}</td>
              <td class="py-3 px-4 border">{role.descripcion}</td>
              <td class="py-3 px-4 border text-center flex justify-center space-x-2">
                <button
                  class="bg-yellow-400 hover:bg-yellow-500 text-white px-4 py-1 rounded font-bold"
                  on:click={() => editRole(role)}
                >
                  Editar
                </button>
                <button
                  class="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded font-bold"
                  on:click={() => deleteRole(role.id)}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          {/each}
        {:else}
          <tr>
            <td colspan="3" class="py-3 px-4 text-center text-gray-500">No se encontraron roles.</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Role Form -->
  {#if showForm}
    <div class="bg-white shadow-md rounded px-8 py-6 max-w-lg mx-auto">
      <h2 class="text-2xl font-bold mb-4">{isEditing ? 'Editar Rol' : 'Agregar Rol'}</h2>
      <form on:submit|preventDefault={saveRole}>
        <div class="mb-4">
          <label for="nombre_rol" class="block text-gray-700 text-sm font-medium">Nombre del Rol</label>
          <input
            type="text"
            id="nombre_rol"
            bind:value={currentRole.nombre_rol}
            required
            class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
          />
        </div>
        <div class="mb-4">
          <label for="descripcion" class="block text-gray-700 text-sm font-medium">Descripción</label>
          <textarea
            id="descripcion"
            bind:value={currentRole.descripcion}
            class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
          ></textarea>
        </div>
        <div class="flex justify-end space-x-4">
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
            Guardar
          </button>
        </div>
      </form>
    </div>
  {/if}
</div>
