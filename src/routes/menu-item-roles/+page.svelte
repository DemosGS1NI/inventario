<script>
	import { onMount } from 'svelte';
	import { addToast } from '$lib/stores/toast';
	import BackToMenuButton from '$lib/BackToMenu.svelte';

	let assignments = [];
	let items = [];
	let roles = [];
	let loading = false;
	let selectedItem = '';
	let selectedRole = '';
	let showAddForm = false;

	async function fetchAssignments() {
		try {
			const res = await fetch('/api/db/menu_item_roles');
			const data = await res.json();
			if (data.status === 'success') {
				assignments = data.data;
			} else {
				addToast(data.message || 'Error al cargar asignaciones.', 'error');
			}
		} catch (err) {
			console.error('Error fetching assignments:', err);
			addToast('Ocurrió un error al cargar asignaciones.', 'error');
		}
	}

	async function fetchItems() {
		try {
			const res = await fetch('/api/db/menu_items');
			const data = await res.json();
			if (data.status === 'success') {
				items = data.data;
			} else {
				addToast(data.message || 'Error al cargar ítems.', 'error');
			}
		} catch (err) {
			console.error('Error fetching items:', err);
			addToast('Ocurrió un error al cargar ítems.', 'error');
		}
	}

	async function fetchRoles() {
		try {
			const res = await fetch('/api/db/roles');
			const data = await res.json();
			if (data.status === 'success') {
				roles = data.data;
			} else {
				addToast(data.message || 'Error al cargar roles.', 'error');
			}
		} catch (err) {
			console.error('Error fetching roles:', err);
			addToast('Ocurrió un error al cargar roles.', 'error');
		}
	}

	async function assignRole() {
		if (!selectedItem || !selectedRole || loading) return;
		loading = true;
		try {
			const res = await fetch('/api/db/menu_item_roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ menu_item_id: selectedItem, role_id: selectedRole })
			});
			const data = await res.json();
			if (data.status === 'success') {
				addToast('Rol asignado con éxito!', 'success');
				await fetchAssignments();
				selectedItem = '';
				selectedRole = '';
			} else {
				addToast(data.message || 'Error al asignar rol.', 'error');
			}
		} catch (err) {
			console.error('Error assigning role:', err);
			addToast('Ocurrió un error al asignar rol.', 'error');
		} finally {
			loading = false;
		}
	}

	async function removeAssignment(menu_item_id, role_id) {
		if (loading) return;
		if (!confirm('¿Está seguro de que desea eliminar esta asignación?')) return;
		loading = true;
		try {
			const res = await fetch('/api/db/menu_item_roles', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ menu_item_id, role_id })
			});
			const data = await res.json();
			if (data.status === 'success') {
				addToast('Asignación eliminada con éxito!', 'success');
				await fetchAssignments();
			} else {
				addToast(data.message || 'Error al eliminar asignación.', 'error');
			}
		} catch (err) {
			console.error('Error removing assignment:', err);
			addToast('Ocurrió un error al eliminar asignación.', 'error');
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await fetchItems();
		await fetchRoles();
		await fetchAssignments();
	});
</script>

<div class="min-h-screen bg-gray-100 p-6">
	<h1 class="mb-6 text-center text-3xl font-bold text-gray-800">
		Gestión de Roles por Ítem de Menú
	</h1>
	<div class="mb-6">
		<BackToMenuButton />
	</div>

	<!-- Add Assignment Section at the top -->
	<div class="mb-6 flex justify-center">
		{#if !showAddForm}
			<button
				class="rounded bg-blue-500 px-6 py-2 font-bold text-white hover:bg-blue-600"
				on:click={() => (showAddForm = true)}
			>
				Agregar Asignación
			</button>
		{:else}
			<div class="flex flex-wrap items-end justify-center gap-4">
				<div>
					<label for="role-select" class="block text-sm font-medium text-gray-700">Rol</label>
					<select id="role-select" bind:value={selectedRole} class="w-48 rounded border px-3 py-2">
						<option value="" disabled>Seleccione un rol</option>
						{#each roles as role}
							<option value={role.id}>{role.nombre_rol}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="item-select" class="block text-sm font-medium text-gray-700"
						>Ítem de Menú</label
					>
					<select id="item-select" bind:value={selectedItem} class="w-48 rounded border px-3 py-2">
						<option value="" disabled>Seleccione un ítem</option>
						{#each items as item}
							<option value={item.id}>{item.label}</option>
						{/each}
					</select>
				</div>
				<button
					class="rounded bg-blue-500 px-6 py-2 font-bold text-white hover:bg-blue-600"
					on:click={assignRole}
					disabled={loading || !selectedItem || !selectedRole}
				>
					{#if loading}Asignando...{:else}Asignar Opciones de Menú{/if}
				</button>
				<button
					type="button"
					class="rounded bg-gray-300 px-4 py-2 font-bold text-gray-800 hover:bg-gray-400"
					on:click={() => {
						showAddForm = false;
						selectedItem = '';
						selectedRole = '';
					}}
				>
					Cancelar
				</button>
			</div>
		{/if}
	</div>

	<div class="mt-8 overflow-x-auto rounded bg-white shadow-md">
		<table class="w-full table-auto border-collapse">
			<thead class="bg-gray-200 text-gray-700">
				<tr>
					<th class="border px-4 py-3">Rol</th>
					<th class="border px-4 py-3">Categoría</th>
					<th class="border px-4 py-3">Ítem de Menú</th>
					<th class="border px-4 py-3 text-center">Acciones</th>
				</tr>
			</thead>
			<tbody class="text-gray-600">
				{#if assignments.length > 0}
					{#each assignments as a, i}
						{#if i === 0 || a.role_id !== assignments[i - 1].role_id}
							<tr><td colspan="4" class="bg-blue-100 px-4 py-2 font-bold">{a.role_name}</td></tr>
						{/if}
						<tr class="hover:bg-gray-50">
							<td class="border px-4 py-3">{a.role_name}</td>
							<td class="border px-4 py-3">{a.category_name}</td>
							<td class="border px-4 py-3">{a.menu_item_label}</td>
							<td class="flex justify-center space-x-2 border px-4 py-3 text-center">
								<button
									class="rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-600"
									on:click={() => removeAssignment(a.menu_item_id, a.role_id)}>Eliminar</button
								>
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="4" class="border px-4 py-3 text-center text-gray-500"
							>No hay asignaciones disponibles.</td
						>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
