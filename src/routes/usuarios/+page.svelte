<script>
	import { onMount } from 'svelte';
	import BackToMenuButton from '$lib/BackToMenu.svelte';
	import { addToast } from '$lib/stores/toast';
	import { formatDateTime } from '$lib/utils/dateFormat.js';

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

	// Fetch users
	const fetchUsuarios = async () => {
		try {
			const response = await fetch('/api/db/usuarios');
			const data = await response.json();

			if (data.status === 'success') {
				usuarios = data.data;
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
		if (loading) return; //prevent double submissions
		const method = currentUser.id ? 'PUT' : 'POST';
		loading = true;
		try {
			const response = await fetch('/api/db/usuarios', {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(currentUser)
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

<div class="min-h-screen bg-gray-100 p-6">
	<h1 class="mb-6 text-center text-3xl font-bold text-gray-800">Gestión de Usuarios</h1>

	<div class="mb-6">
		<BackToMenuButton />
	</div>

	<div class="mb-6 flex justify-center">
		<button
			class="rounded bg-blue-500 px-6 py-2 font-bold text-white hover:bg-blue-600"
			on:click={() => {
				showForm = true;
				currentUser = {
					id: null,
					numero_telefono: '',
					nombre: '',
					apellido: '',
					rol_id: null,
					activo: true,
					debe_cambiar_pin: true
				};
			}}
		>
			Agregar Usuario
		</button>
	</div>

	{#if showForm}
		<div class="mx-auto mb-6 max-w-lg rounded bg-white px-8 py-6 shadow-md">
			<form on:submit|preventDefault={saveUser}>
				<div class="grid grid-cols-1 gap-4">
					<div>
						<label for="nombre" class="block text-sm font-medium text-gray-700">Nombre</label>
						<input
							type="text"
							id="nombre"
							bind:value={currentUser.nombre}
							required
							class="w-full rounded border px-3 py-2 focus:border-primary focus:ring-primary"
						/>
					</div>
					<div>
						<label for="apellido" class="block text-sm font-medium text-gray-700">Apellido</label>
						<input
							type="text"
							id="apellido"
							bind:value={currentUser.apellido}
							required
							class="w-full rounded border px-3 py-2 focus:border-primary focus:ring-primary"
						/>
					</div>
					<div>
						<label for="rol_id" class="block text-sm font-medium text-gray-700">Rol</label>
						<select
							id="rol_id"
							bind:value={currentUser.rol_id}
							required
							class="w-full rounded border bg-white px-3 py-2 focus:border-primary focus:ring-primary"
						>
							<option value="" disabled>Seleccione un rol</option>
							{#each roles as role}
								<option value={role.id}>{role.nombre_rol}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="activo" class="block text-sm font-medium text-gray-700">Activo</label>
						<input
							type="checkbox"
							id="activo"
							bind:checked={currentUser.activo}
							class="h-5 w-5 rounded border focus:border-primary focus:ring-primary"
						/>
					</div>
					<div>
						<label for="numero_telefono" class="block text-sm font-medium text-gray-700">Teléfono</label>
						<input
							type="text"
							id="numero_telefono"
							bind:value={currentUser.numero_telefono}
							required
							maxlength="10"
							class="w-full rounded border px-3 py-2 focus:border-primary focus:ring-primary"
						/>
					</div>
					<div>
						<label for="fecha_creacion" class="block text-sm font-medium text-gray-700">Fecha creación</label>
						<div id="fecha_creacion" class="w-full rounded border bg-gray-100 px-3 py-2">{currentUser.fecha_creacion ? formatDateTime(currentUser.fecha_creacion) : '-'}</div>
					</div>
					<div>
						<label for="creado_por" class="block text-sm font-medium text-gray-700">Creado por</label>
						<div id="creado_por" class="w-full rounded border bg-gray-100 px-3 py-2">{currentUser.creador_nombre ? `${currentUser.creador_nombre} ${currentUser.creador_apellido}` : '-'}</div>
					</div>
					<div>
						<label for="fecha_actualizacion" class="block text-sm font-medium text-gray-700">Fecha actualización</label>
						<div id="fecha_actualizacion" class="w-full rounded border bg-gray-100 px-3 py-2">{currentUser.fecha_actualizacion ? formatDateTime(currentUser.fecha_actualizacion) : '-'}</div>
					</div>
					<div>
						<label for="actualizado_por" class="block text-sm font-medium text-gray-700">Actualizado por</label>
						<div id="actualizado_por" class="w-full rounded border bg-gray-100 px-3 py-2">{currentUser.actualizador_nombre ? `${currentUser.actualizador_nombre} ${currentUser.actualizador_apellido}` : '-'}</div>
					</div>
				</div>
				<div class="mt-4 flex justify-end space-x-4">
					<button
						type="button"
						on:click={() => {
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
						}}
						class="rounded bg-gray-300 px-4 py-2 font-bold text-gray-800 hover:bg-gray-400"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={loading}
						class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-400"
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

	<div class="overflow-x-auto rounded bg-white shadow-md">
		<table class="w-full table-auto border-collapse">
			<thead class="bg-gray-200 text-gray-700">
				<tr>
					<th class="border px-4 py-3">Nombre</th>
					<th class="border px-4 py-3">Apellido</th>
					<th class="border px-4 py-3">Rol</th>
					<th class="border px-4 py-3">Activo</th>
					<th class="border px-4 py-3">Teléfono</th>
					<th class="border px-4 py-3">Fecha creación</th>
					<th class="border px-4 py-3">Creado por</th>
					<th class="border px-4 py-3">Fecha actualización</th>
					<th class="border px-4 py-3">Actualizado por</th>
					<th class="border px-4 py-3 text-center">Acciones</th>
				</tr>
			</thead>
			<tbody class="text-gray-600">
				{#if usuarios.length > 0}
					{#each usuarios as usuario}
						<tr class="hover:bg-gray-50">
							<td class="border px-4 py-3">{usuario.nombre}</td>
							<td class="border px-4 py-3">{usuario.apellido}</td>
							<td class="border px-4 py-3">{roles.find((r) => r.id === usuario.rol_id)?.nombre_rol || 'N/A'}</td>
							<td class="border px-4 py-3 text-center">{usuario.activo ? 'Sí' : 'No'}</td>
							<td class="border px-4 py-3">{usuario.numero_telefono}</td>
							<td class="border px-4 py-3">{usuario.fecha_creacion ? formatDateTime(usuario.fecha_creacion) : '-'}</td>
							<td class="border px-4 py-3 text-center">{usuario.creador_nombre ? `${usuario.creador_nombre} ${usuario.creador_apellido}` : '-'}</td>
							<td class="border px-4 py-3">{usuario.fecha_actualizacion ? formatDateTime(usuario.fecha_actualizacion) : '-'}</td>
							<td class="border px-4 py-3 text-center">{usuario.actualizador_nombre ? `${usuario.actualizador_nombre} ${usuario.actualizador_apellido}` : '-'}</td>
							<td class="flex justify-center space-x-2 border px-4 py-3 text-center">
								<button
									class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
									on:click={() => editUser(usuario)}
								>
									Editar
								</button>
								<button
									class="rounded bg-red-500 px-4 py-1 font-bold text-white hover:bg-red-600"
									on:click={() => deleteUser(usuario.id)}
								>
									Eliminar
								</button>
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="9" class="border px-4 py-3 text-center text-gray-500">
							No hay usuarios disponibles.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
