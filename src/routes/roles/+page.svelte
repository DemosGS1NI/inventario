<script>
	import { onMount } from 'svelte';
	import BackToMenuButton from '$lib/BackToMenu.svelte';
	import { addToast } from '$lib/stores/toast';

	let roles = [];
	let currentRole = { id: null, nombre_rol: '', descripcion: '' };
	let showForm = false;

	// Fetch all roles
	async function fetchRoles() {
		try {
			const res = await fetch('/api/db/roles');
			const data = await res.json();

			if (res.ok && data.status === 'success') {
				roles = data.data;
			} else {
				addToast(data.message || 'Error al cargar roles.', 'error');
			}
		} catch (error) {
			console.error('Error fetching roles:', error);
			addToast('Ocurrió un error al cargar roles.', 'error');
		}
	}

	// Save or update a role
	async function saveRole() {
		const method = currentRole.id ? 'PUT' : 'POST';
		try {
			const res = await fetch('/api/db/roles', {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(currentRole)
			});

			const data = await res.json();

			if (res.ok && data.status === 'success') {
				const successMessage = currentRole.id
					? 'Rol actualizado con éxito!'
					: 'Rol creado con éxito!';
				addToast(successMessage, 'success');
				await fetchRoles();
				resetForm();
				showForm = false;
			} else {
				addToast(data.message || 'Error al guardar el rol.', 'error');
			}
		} catch (error) {
			console.error('Error saving role:', error);
			addToast('Ocurrió un error al guardar el rol.', 'error');
		}
	}

	function editRole(role) {
		currentRole = { ...role };
		showForm = true;
	}

	function resetForm() {
		currentRole = { id: null, nombre_rol: '', descripcion: '' };
	}

	// Delete a role
	const deleteRole = async (id) => {
		if (!confirm('¿Está seguro de que desea eliminar este rol?')) return;

		try {
			const res = await fetch('/api/db/roles', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});

			const data = await res.json();
			if (data.status === 'success') {
				addToast('Rol eliminado con éxito!', 'success');
				await fetchRoles();
			} else {
				addToast(data.error?.message || 'Error al eliminar el rol.', 'error');
			}
		} catch (err) {
			console.error('Error deleting role:', err);
			addToast('Ocurrió un error al eliminar el rol.', 'error');
		}
	};

	onMount(fetchRoles);
</script>

<!-- UI -->
<div class="min-h-screen bg-gray-100 p-6">
	<h1 class="mb-6 text-center text-3xl font-bold text-gray-800">Gestión de Roles</h1>

	<div class="mb-6">
		<BackToMenuButton />
	</div>

	<div class="mb-6 flex justify-center">
		<button
			class="rounded bg-blue-500 px-6 py-2 font-bold text-white hover:bg-blue-600"
			on:click={() => {
				showForm = true;
				resetForm();
			}}
		>
			Agregar Rol
		</button>
	</div>

	<!-- Role Form -->
	{#if showForm}
		<div class="mx-auto mb-6 max-w-lg rounded bg-white px-8 py-6 shadow-md">
			<form on:submit|preventDefault={saveRole}>
				<div class="grid grid-cols-1 gap-4">
					<!-- Role Name -->
					<div>
						<label for="nombre_rol" class="block text-sm font-medium text-gray-700">Nombre del Rol</label>
						<input
							type="text"
							id="nombre_rol"
							bind:value={currentRole.nombre_rol}
							required
							class="w-full rounded border px-3 py-2 focus:border-primary focus:ring-primary"
						/>
					</div>

					<!-- Description -->
					<div>
						<label for="descripcion" class="block text-sm font-medium text-gray-700"
							>Descripción</label
						>
						<textarea
							id="descripcion"
							bind:value={currentRole.descripcion}
							class="w-full rounded border px-3 py-2 focus:border-primary focus:ring-primary"
						></textarea>
					</div>
				</div>

				<!-- Form Actions -->
				<div class="mt-4 flex justify-end space-x-4">
					<button
						type="button"
						on:click={() => {
							showForm = false;
							resetForm();
						}}
						class="rounded bg-gray-300 px-4 py-2 font-bold text-gray-800 hover:bg-gray-400"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600"
					>
						Guardar
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Role Table -->
	<div class="overflow-x-auto rounded bg-white shadow-md">
		<table class="w-full table-auto border-collapse">
			<thead class="bg-gray-200 text-gray-700">
				<tr>
					<th class="border px-4 py-3">ID</th>
					<th class="border px-4 py-3">Rol</th>
					<th class="border px-4 py-3">Descripción</th>
					<th class="border px-4 py-3 text-center">Acciones</th>
				</tr>
			</thead>
			<tbody class="text-gray-600">
				{#if roles.length > 0}
					{#each roles as role}
						<tr class="hover:bg-gray-50">
							<td class="border px-4 py-3">{role.id}</td>
							<td class="border px-4 py-3">{role.nombre_rol}</td>
							<td class="border px-4 py-3">{role.descripcion}</td>
							<td class="flex justify-center space-x-2 border px-4 py-3 text-center">
								<button
									class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
									on:click={() => {
										showForm = true;
										currentRole = { ...role };
									}}
								>
									Editar
								</button>
								<button
									class="rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-600"
									on:click={() => deleteRole(role.id)}
								>
									Eliminar
								</button>
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="4" class="border px-4 py-3 text-center text-gray-500"
							>No hay roles disponibles.</td
						>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
