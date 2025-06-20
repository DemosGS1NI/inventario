<script>
	import { onMount } from 'svelte';
	import { addToast } from '$lib/stores/toast';
	import BackToMenuButton from '$lib/BackToMenu.svelte';

	let items = [];
	let categories = [];
	let loading = false;
	let showForm = false;
	let currentItem = { id: null, category_id: '', label: '', href: '', order_index: 0, is_active: true };

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

	async function fetchCategories() {
		try {
			const res = await fetch('/api/db/menu_categories');
			const data = await res.json();
			if (data.status === 'success') {
				categories = data.data;
			} else {
				addToast(data.message || 'Error al cargar categorías.', 'error');
			}
		} catch (err) {
			console.error('Error fetching categories:', err);
			addToast('Ocurrió un error al cargar categorías.', 'error');
		}
	}

	async function saveItem() {
		if (loading) return;
		loading = true;
		const method = currentItem.id ? 'PUT' : 'POST';
		try {
			const res = await fetch('/api/db/menu_items', {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(currentItem)
			});
			const data = await res.json();
			if (data.status === 'success') {
				addToast('Ítem guardado con éxito!', 'success');
				await fetchItems();
				showForm = false;
				currentItem = { id: null, category_id: '', label: '', href: '', order_index: 0, is_active: true };
			} else {
				addToast(data.message || 'Error al guardar el ítem.', 'error');
			}
		} catch (err) {
			console.error('Error saving item:', err);
			addToast('Ocurrió un error al guardar el ítem.', 'error');
		} finally {
			loading = false;
		}
	}

	function editItem(item) {
		currentItem = { ...item };
		showForm = true;
	}

	async function deleteItem(id) {
		if (!confirm('¿Está seguro de que desea eliminar este ítem?')) return;
		try {
			const res = await fetch('/api/db/menu_items', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
			const data = await res.json();
			if (data.status === 'success') {
				addToast('Ítem eliminado con éxito!', 'success');
				await fetchItems();
			} else {
				addToast(data.message || 'Error al eliminar el ítem.', 'error');
			}
		} catch (err) {
			console.error('Error deleting item:', err);
			addToast('Ocurrió un error al eliminar el ítem.', 'error');
		}
	}

	onMount(async () => {
		await fetchCategories();
		await fetchItems();
	});
</script>

<div class="min-h-screen bg-gray-100 p-6">
	<h1 class="mb-6 text-center text-3xl font-bold text-gray-800">Gestión de Ítems de Menú</h1>

	<div class="mb-6 flex justify-center">
		<button
			class="rounded bg-blue-500 px-6 py-2 font-bold text-white hover:bg-blue-600"
			on:click={() => { showForm = true; currentItem = { id: null, category_id: '', label: '', href: '', order_index: 0, is_active: true }; }}
		>
			Agregar Ítem
		</button>
	</div>

	{#if showForm}
		<div class="mx-auto mb-6 max-w-lg rounded bg-white px-8 py-6 shadow-md">
			<form on:submit|preventDefault={saveItem}>
				<div class="grid grid-cols-1 gap-4">
					<div>
						<label for="category_id" class="block text-sm font-medium text-gray-700">Categoría</label>
						<select id="category_id" bind:value={currentItem.category_id} required class="w-full rounded border bg-white px-3 py-2 focus:border-primary focus:ring-primary">
							<option value="" disabled>Seleccione una categoría</option>
							{#each categories as cat}
								<option value={cat.id}>{cat.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="label" class="block text-sm font-medium text-gray-700">Etiqueta</label>
						<input type="text" id="label" bind:value={currentItem.label} required class="w-full rounded border px-3 py-2 focus:border-primary focus:ring-primary" />
					</div>
					<div>
						<label for="href" class="block text-sm font-medium text-gray-700">Ruta (href)</label>
						<input type="text" id="href" bind:value={currentItem.href} class="w-full rounded border px-3 py-2 focus:border-primary focus:ring-primary" />
					</div>
					<div>
						<label for="order_index" class="block text-sm font-medium text-gray-700">Orden</label>
						<input type="number" id="order_index" bind:value={currentItem.order_index} min="0" class="w-full rounded border px-3 py-2 focus:border-primary focus:ring-primary" />
					</div>
					<div>
						<label for="is_active" class="block text-sm font-medium text-gray-700">Activo</label>
						<input type="checkbox" id="is_active" bind:checked={currentItem.is_active} class="h-5 w-5 rounded border focus:border-primary focus:ring-primary" />
					</div>
				</div>
				<div class="mt-4 flex justify-end space-x-4">
					<button type="button" on:click={() => { showForm = false; currentItem = { id: null, category_id: '', label: '', href: '', order_index: 0, is_active: true }; }} class="rounded bg-gray-300 px-4 py-2 font-bold text-gray-800 hover:bg-gray-400">Cancelar</button>
					<button type="submit" class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600" disabled={loading}>
						{#if loading}Guardando...{:else}Guardar{/if}
					</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="mb-6">
		<BackToMenuButton />
	</div>

	<div class="overflow-x-auto rounded bg-white shadow-md">
		<table class="w-full table-auto border-collapse">
			<thead class="bg-gray-200 text-gray-700">
				<tr>
					<th class="border px-4 py-3">Categoría</th>
					<th class="border px-4 py-3">Etiqueta</th>
					<th class="border px-4 py-3">Ruta</th>
					<th class="border px-4 py-3">Orden</th>
					<th class="border px-4 py-3">Activo</th>
					<th class="border px-4 py-3 text-center">Acciones</th>
				</tr>
			</thead>
			<tbody class="text-gray-600">
				{#if items.length > 0}
					{#each items as item}
						<tr class="hover:bg-gray-50">
							<td class="border px-4 py-3">{item.category_name}</td>
							<td class="border px-4 py-3">{item.label}</td>
							<td class="border px-4 py-3">{item.href}</td>
							<td class="border px-4 py-3">{item.order_index}</td>
							<td class="border px-4 py-3 text-center">{item.is_active ? 'Sí' : 'No'}</td>
							<td class="flex justify-center space-x-2 border px-4 py-3 text-center">
								<button class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600" on:click={() => editItem(item)}>Editar</button>
								<button class="rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-600" on:click={() => deleteItem(item.id)}>Eliminar</button>
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="6" class="border px-4 py-3 text-center text-gray-500">No hay ítems disponibles.</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
