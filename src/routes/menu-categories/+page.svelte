<script>
	import { onMount } from 'svelte';
	import { addToast } from '$lib/stores/toast';
	import BackToMenuButton from '$lib/BackToMenu.svelte';

	let categories = [];
	let loading = false;
	let showForm = false;
	let currentCategory = { id: null, name: '', order_index: 0 };

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

	async function saveCategory() {
		if (loading) return;
		loading = true;
		const method = currentCategory.id ? 'PUT' : 'POST';
		try {
			const res = await fetch('/api/db/menu_categories', {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(currentCategory)
			});
			const data = await res.json();
			if (data.status === 'success') {
				addToast('Categoría guardada con éxito!', 'success');
				await fetchCategories();
				showForm = false;
				currentCategory = { id: null, name: '', order_index: 0 };
			} else {
				addToast(data.message || 'Error al guardar la categoría.', 'error');
			}
		} catch (err) {
			console.error('Error saving category:', err);
			addToast('Ocurrió un error al guardar la categoría.', 'error');
		} finally {
			loading = false;
		}
	}

	function editCategory(cat) {
		currentCategory = { ...cat };
		showForm = true;
	}

	async function deleteCategory(id) {
		if (!confirm('¿Está seguro de que desea eliminar esta categoría?')) return;
		try {
			const res = await fetch('/api/db/menu_categories', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
			const data = await res.json();
			if (data.status === 'success') {
				addToast('Categoría eliminada con éxito!', 'success');
				await fetchCategories();
			} else {
				addToast(data.message || 'Error al eliminar la categoría.', 'error');
			}
		} catch (err) {
			console.error('Error deleting category:', err);
			addToast('Ocurrió un error al eliminar la categoría.', 'error');
		}
	}

	onMount(fetchCategories);
</script>

<div class="min-h-screen bg-gray-100 p-6">
	<h1 class="mb-6 text-center text-3xl font-bold text-gray-800">Gestión de Categorías de Menú</h1>
	<div class="mb-6">
		<BackToMenuButton />
	</div>
	<div class="mb-6 flex justify-center">
		<button
			class="rounded bg-blue-500 px-6 py-2 font-bold text-white hover:bg-blue-600"
			on:click={() => {
				showForm = true;
				currentCategory = { id: null, name: '', order_index: 0 };
			}}
		>
			Agregar Categoría
		</button>
	</div>

	{#if showForm}
		<div class="mx-auto mb-6 max-w-lg rounded bg-white px-8 py-6 shadow-md">
			<form on:submit|preventDefault={saveCategory}>
				<div class="grid grid-cols-1 gap-4">
					<div>
						<label for="name" class="block text-sm font-medium text-gray-700">Nombre</label>
						<input
							type="text"
							id="name"
							bind:value={currentCategory.name}
							required
							class="w-full rounded border px-3 py-2 focus:border-primary focus:ring-primary"
						/>
					</div>
					<div>
						<label for="order_index" class="block text-sm font-medium text-gray-700">Orden</label>
						<input
							type="number"
							id="order_index"
							bind:value={currentCategory.order_index}
							min="0"
							class="w-full rounded border px-3 py-2 focus:border-primary focus:ring-primary"
						/>
					</div>
				</div>
				<div class="mt-4 flex justify-end space-x-4">
					<button
						type="button"
						on:click={() => {
							showForm = false;
							currentCategory = { id: null, name: '', order_index: 0 };
						}}
						class="rounded bg-gray-300 px-4 py-2 font-bold text-gray-800 hover:bg-gray-400"
						>Cancelar</button
					>
					<button
						type="submit"
						class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600"
						disabled={loading}
					>
						{#if loading}Guardando...{:else}Guardar{/if}
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
					<th class="border px-4 py-3">Orden</th>
					<th class="border px-4 py-3 text-center">Acciones</th>
				</tr>
			</thead>
			<tbody class="text-gray-600">
				{#if categories.length > 0}
					{#each categories as cat}
						<tr class="hover:bg-gray-50">
							<td class="border px-4 py-3">{cat.name}</td>
							<td class="border px-4 py-3">{cat.order_index}</td>
							<td class="flex justify-center space-x-2 border px-4 py-3 text-center">
								<button
									class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
									on:click={() => editCategory(cat)}>Editar</button
								>
								<button
									class="rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-600"
									on:click={() => deleteCategory(cat.id)}>Eliminar</button
								>
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="3" class="border px-4 py-3 text-center text-gray-500"
							>No hay categorías disponibles.</td
						>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
