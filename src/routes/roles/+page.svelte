<script>
  import { onMount } from 'svelte';
  import BackToMenuButton from '$lib/BackToMenu.svelte';

  let roles = [];
  let currentRole = {
    id: null,
    nombre_rol: '',
    descripcion: '',
    opciones_menu: '{}',
    accesos_api: '{}',
  };
  let showForm = false;
  let message = '';

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/db/roles');
      const data = await res.json();
      if (data.success) roles = data.data;
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  // Save or update a role
  const saveRole = async () => {
    const method = currentRole.id ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/db/roles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRole),
      });

      const data = await res.json();
      if (data.success) {
        message = 'Rol guardado con éxito!';
        await fetchRoles();
        resetForm();
        showForm = false;
      } else {
        message = data.error || 'Error al guardar el rol.';
      }
    } catch (err) {
      console.error('Error saving role:', err);
      message = 'Ocurrió un error al guardar el rol.';
    }
  };

  // Delete a role
  const deleteRole = async (id) => {
    if (!confirm('¿Está seguro de que desea eliminar este rol?')) return;

    try {
      const res = await fetch('/api/db/roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (data.success) {
        message = 'Rol eliminado con éxito!';
        await fetchRoles();
      } else {
        message = data.error || 'Error al eliminar el rol.';
      }
    } catch (err) {
      console.error('Error deleting role:', err);
      message = 'Ocurrió un error al eliminar el rol.';
    }
  };

  const resetForm = () => {
    currentRole = {
      id: null,
      nombre_rol: '',
      descripcion: '',
      opciones_menu: '{}',
      accesos_api: '{}',
    };
  };

  onMount(fetchRoles);
</script>

<div class="p-6 bg-gray-100 min-h-screen">
  <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">Gestión de Roles</h1>

  <div class="mb-6">
    <BackToMenuButton />
  </div>

  {#if message}
    <p class="text-center text-green-600 mb-4">{message}</p>
  {/if}

  <div class="flex justify-center mb-6">
    <button
      class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded font-bold"
      on:click={() => {
        showForm = true;
        resetForm();
      }}
    >
      Agregar Rol
    </button>
  </div>

  {#if showForm}
    <div class="bg-white shadow-md rounded px-8 py-6 mb-6 max-w-lg mx-auto">
      <form on:submit|preventDefault={saveRole}>
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label for="nombre_rol" class="block text-gray-700 text-sm font-medium">Nombre del Rol</label>
            <input
              type="text"
              id="nombre_rol"
              bind:value={currentRole.nombre_rol}
              required
              class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label for="descripcion" class="block text-gray-700 text-sm font-medium">Descripción</label>
            <textarea
              id="descripcion"
              bind:value={currentRole.descripcion}
              class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
            ></textarea>
          </div>
          <div>
            <label for="opciones_menu" class="block text-gray-700 text-sm font-medium">Opciones de Menú (JSON)</label>
            <textarea
              id="opciones_menu"
              bind:value={currentRole.opciones_menu}
              class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
            ></textarea>
          </div>
          <div>
            <label for="accesos_api" class="block text-gray-700 text-sm font-medium">Accesos a API (JSON)</label>
            <textarea
              id="accesos_api"
              bind:value={currentRole.accesos_api}
              class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
            ></textarea>
          </div>
        </div>
        <div class="flex justify-end mt-4 space-x-4">
          <button
            type="button"
            on:click={() => {
              showForm = false;
              resetForm();
            }}
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

  <div class="overflow-x-auto bg-white shadow-md rounded">
    <table class="table-auto w-full border-collapse">
      <thead class="bg-gray-200 text-gray-700">
        <tr>
          <th class="py-3 px-4 border">Nombre del Rol</th>
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
                  class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  on:click={() => {
                    showForm = true;
                    currentRole = { ...role };
                  }}
                >
                  Editar
                </button>
                <button
                  class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-bold"
                  on:click={() => deleteRole(role.id)}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          {/each}
        {:else}
          <tr>
            <td colspan="3" class="py-3 px-4 border text-center text-gray-500">No hay roles disponibles.</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
