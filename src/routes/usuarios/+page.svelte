<script>
  import { onMount } from 'svelte';
  import BackToMenuButton from '$lib/BackToMenu.svelte';
  import { addToast } from '$lib/stores/toast'; // ADD THIS IMPORT

  let usuarios = [];
  let roles = [];
  let loading = false;
  let currentUser = {
    id: null,
    numero_telefono: '',
    nombre: '',
    apellido: '',
    rol_id: null,
    activo: true,
    debe_cambiar_pin: false
  };
  let showForm = false;
  // REMOVE: let message = '';
  // REMOVE: let messageType = 'success';

  // Fetch users
  const fetchUsuarios = async () => {
    try {
      const response = await fetch('/api/db/usuarios');
      const data = await response.json();
      
      if (data.status === 'success') {
        usuarios = data.data.users;
        // REMOVE: message = '';
      } else {
        addToast(data.error?.message || 'Error al cargar los usuarios.', 'error');
      }
    } catch (err) {
      console.error('Error fetching usuarios:', err);
      addToast(err.message || 'Error al cargar los usuarios.', 'error');
    }
  };

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/db/roles');
      const data = await res.json();
      if (data.status === 'success') {
        roles = data.data;
        // REMOVE: message = '';
      } else {
        addToast(data.error?.message || 'Error al cargar los roles.', 'error');
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      addToast(err.message || 'Ocurrió un error al cargar los roles.', 'error');
    }
  };

  // Save or update a user
  const saveUser = async () => {
    if (loading) return;  //prevent double submissions
    const method = currentUser.id ? 'PUT' : 'POST';
    loading = true;
    try {
      const response = await fetch('/api/db/usuarios', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentUser),
      });

      const data = await response.json();

      if (data.status === 'success') {
        const successMessage = currentUser.id 
          ? 'Usuario actualizado con éxito!' 
          : 'Usuario creado con éxito!';
        addToast(successMessage, 'success');
        await fetchUsuarios();
        showForm = false;
        currentUser = { 
          id: null, 
          numero_telefono: '', 
          nombre: '', 
          apellido: '', 
          rol_id: null, 
          activo: true, 
          debe_cambiar_pin: true 
        };
      } else {
        addToast(data.error?.message || 'Error al guardar el usuario.', 'error');
      }
    } catch (err) {
      console.error('Error saving user:', err);
      addToast(err.message || 'Ocurrió un error al guardar el usuario.', 'error');
    } finally {
      loading = false;
    }
  };

  // Delete user
  const deleteUser = async (id) => {
    if (!confirm('¿Está seguro de que desea eliminar este usuario?')) return;

    try {
      const response = await fetch('/api/db/usuarios', { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });

      const data = await response.json();

      if (data.status === 'success') {
        addToast('Usuario eliminado con éxito!', 'success');
        await fetchUsuarios();
      } else {
        addToast(data.error?.message || 'Error al eliminar el usuario.', 'error');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      addToast(err.message || 'Ocurrió un error al eliminar el usuario.', 'error');
    }
  };

  // Edit user
  const editUser = (user) => {
    currentUser = { ...user };
    showForm = true;
  };

  // Load data on mount
  onMount(async () => {
    await fetchUsuarios();
    await fetchRoles();
  });
</script>

<div class="p-6 bg-gray-100 min-h-screen">
  <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">Gestión de Usuarios</h1>

  <div class="mb-6">
    <BackToMenuButton />
  </div>

  <!-- REMOVE THIS ENTIRE MESSAGE SECTION:
  {#if message}
    <p class={`text-center mb-4 ${messageType === 'error' ? 'text-red-600' : 'text-green-600'}`}>
      {message}
    </p>
  {/if}
  -->

  <div class="flex justify-center mb-6">
    <button
      class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded font-bold"
      on:click={() => {
        showForm = true;
        currentUser = { id: null, numero_telefono: '', nombre: '', apellido: '', rol_id: null, activo: true, debe_cambiar_pin: true };
      }}
    >
      Agregar Usuario
    </button>
  </div>

  {#if showForm}
    <div class="bg-white shadow-md rounded px-8 py-6 mb-6 max-w-lg mx-auto">
      <form on:submit|preventDefault={saveUser}>
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label for="numero_telefono" class="block text-gray-700 text-sm font-medium">Teléfono</label>
            <input
              type="text"
              id="numero_telefono"
              bind:value={currentUser.numero_telefono}
              required
              maxlength="10"
              class="w-full px-3 py-2 border rounded focus:ring-primary focus:border-primary"
            />
          </div>
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
            <label for="rol_id" class="block text-gray-700 text-sm font-medium">Rol</label>
            <select
              id="rol_id"
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
          <div>
            <label for="activo" class="block text-gray-700 text-sm font-medium">Activo</label>
            <input
              type="checkbox"
              id="activo"
              bind:checked={currentUser.activo}
              class="w-5 h-5 border rounded focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label for="debe_cambiar_pin" class="block text-gray-700 text-sm font-medium">Forzar Cambio de PIN</label>
            <input
              type="checkbox"
              id="debe_cambiar_pin"
              bind:checked={currentUser.debe_cambiar_pin}
              class="w-5 h-5 border rounded focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
        <div class="flex justify-end mt-4 space-x-4">
          <button
            type="button"
            on:click={() => {
              showForm = false;
              currentUser = { id: null, numero_telefono: '', nombre: '', apellido: '', rol_id: null, activo: true, debe_cambiar_pin: true };
            }}
            class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded font-bold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-bold"
          >
            {#if loading}
              Guardando...
            {:else}
              Guardar
            {/if}
          </button>
        </div>
      </form>
    </div>
  {/if}

  <div class="overflow-x-auto bg-white shadow-md rounded">
    <table class="table-auto w-full border-collapse">
      <thead class="bg-gray-200 text-gray-700">
        <tr>
          <th class="py-3 px-4 border">Teléfono</th>
          <th class="py-3 px-4 border">Nombre</th>
          <th class="py-3 px-4 border">Apellido</th>
          <th class="py-3 px-4 border">Rol</th>
          <th class="py-3 px-4 border">Activo</th>
          <th class="py-3 px-4 border">Forzar Cambio de PIN</th>
          <th class="py-3 px-4 border text-center">Acciones</th>
        </tr>
      </thead>
      <tbody class="text-gray-600">
        {#if usuarios.length > 0}
          {#each usuarios as usuario}
            <tr class="hover:bg-gray-50">
              <td class="py-3 px-4 border">{usuario.numero_telefono}</td>
              <td class="py-3 px-4 border">{usuario.nombre}</td>
              <td class="py-3 px-4 border">{usuario.apellido}</td>
              <td class="py-3 px-4 border">{roles.find(r => r.id === usuario.rol_id)?.nombre_rol || 'N/A'}</td>
              <td class="py-3 px-4 border text-center">{usuario.activo ? 'Sí' : 'No'}</td>
              <td class="py-3 px-4 border text-center">{usuario.debe_cambiar_pin ? 'Sí' : 'No'}</td>
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
        {:else}
          <tr>
            <td colspan="7" class="py-3 px-4 border text-center text-gray-500">
              No hay usuarios disponibles.
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>