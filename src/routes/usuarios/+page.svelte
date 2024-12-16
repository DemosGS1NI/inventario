<script>
  import { onMount } from 'svelte';
  import BackToMenuButton from '$lib/BackToMenu.svelte';

  let usuarios = [];
  let roles = [];
  let currentUser = {};
  let showForm = false;
  let message = '';

  const fetchUsuarios = async () => {
    try {
      const response = await fetch('/api/db/usuarios');
      if (response.ok) {
        usuarios = await response.json();
      } else {
        console.error('Failed to fetch usuarios:', response.statusText);
      }
    } catch (err) {
      console.error('Error fetching usuarios:', err);
    }
  };

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

  const saveUser = async () => {
    const method = currentUser.id ? 'PUT' : 'POST';
    try {
      const response = await fetch('/api/db/usuarios', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentUser),
      });

      if (response.ok) {
        await fetchUsuarios();
        showForm = false;
        currentUser = {};
        message = 'Usuario guardado con éxito!';
      } else {
        const data = await response.json();
        message = data.message || 'Error al guardar el usuario.';
      }
    } catch (err) {
      console.error('Error saving user:', err);
      message = 'Ocurrió un error al guardar el usuario.';
    }
  };

  const editUser = (user) => {
    currentUser = { ...user };
    showForm = true;
  };

  const deleteUser = async (id) => {
    if (!confirm('¿Está seguro de que desea eliminar este usuario?')) return;

    try {
      const response = await fetch(`/api/db/usuarios/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchUsuarios();
        message = 'Usuario eliminado con éxito!';
      } else {
        const data = await response.json();
        message = data.message || 'Error al eliminar el usuario.';
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      message = 'Ocurrió un error al eliminar el usuario.';
    }
  };

  onMount(async () => {
    await fetchUsuarios();
    await fetchRoles();
  });
</script>

<div class="p-6 bg-gray-100 min-h-screen flex flex-col">
  <!-- Title -->
  <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">Gestión de Usuarios</h1>

  <!-- Back to Menu Button -->
  <div class="mb-6">
    <BackToMenuButton />
  </div>

  <!-- Message -->
  {#if message}
    <p class="text-center text-green-600 mb-4">{message}</p>
  {/if}

  <!-- Add User Button -->
  <div class="flex justify-center mb-6">
    <button
      class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded font-bold"
      on:click={() => { showForm = true; currentUser = {}; }}
    >
      Agregar Usuario
    </button>
  </div>

  <!-- User Form -->
  {#if showForm}
    <div class="bg-white shadow-md rounded px-8 py-6 mb-6 max-w-lg mx-auto">
      <form on:submit|preventDefault={saveUser}>
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label for="nombre" class="block text-gray-700 text-sm font-medium">Nombre</label>
            <input
              type="text"
              id="nombre"
              bind:value={currentUser.nombre}
              required
              class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label for="apellido" class="block text-gray-700 text-sm font-medium">Apellido</label>
            <input
              type="text"
              id="apellido"
              bind:value={currentUser.apellido}
              required
              class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label for="telefono" class="block text-gray-700 text-sm font-medium">Teléfono</label>
            <input
              type="text"
              id="telefono"
              bind:value={currentUser.numero_telefono}
              required
              class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label for="rol" class="block text-gray-700 text-sm font-medium">Rol</label>
            <select
              id="rol"
              bind:value={currentUser.rol_id}
              required
              class="w-full px-3 py-2 border rounded bg-white focus:ring-primary focus:border-primary"
            >
              <option value="" disabled>Seleccione un rol</option>
              {#each roles as role}
                <option value={role.id}>{role.nombre_rol}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="flex justify-end mt-4 space-x-4">
          <button
            type="button"
            on:click={() => { showForm = false; currentUser = {}; }}
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

  <!-- User Table -->
  <div class="overflow-x-auto bg-white shadow-md rounded">
    <table class="table-auto w-full border-collapse">
      <thead class="bg-gray-200 text-gray-700">
        <tr>
          <th class="py-3 px-4 border">Nombre</th>
          <th class="py-3 px-4 border">Apellido</th>
          <th class="py-3 px-4 border">Teléfono</th>
          <th class="py-3 px-4 border">Rol</th>
          <th class="py-3 px-4 border text-center">Acciones</th>
        </tr>
      </thead>
      <tbody class="text-gray-600">
        {#each usuarios as usuario}
          <tr class="hover:bg-gray-50">
            <td class="py-3 px-4 border">{usuario.nombre}</td>
            <td class="py-3 px-4 border">{usuario.apellido}</td>
            <td class="py-3 px-4 border">{usuario.numero_telefono}</td>
            <td class="py-3 px-4 border">{usuario.nombre_rol}</td>
            <td class="py-3 px-4 border text-center flex justify-center space-x-2">
              <button
                class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                on:click={() => editUser(usuario)}
              >
                Editar
              </button>
              <button
                class="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded font-bold"
                on:click={() => deleteUser(usuario.id)}
              >
                Eliminar
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
