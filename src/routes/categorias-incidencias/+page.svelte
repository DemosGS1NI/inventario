<script>
	import { onMount } from 'svelte';
	import BackToMenuButton from '$lib/BackToMenu.svelte';
	import { addToast } from '$lib/stores/toast'; // ADD THIS IMPORT

	let categories = [];
	let currentCategory = { id: null, categoria: '', descripcion: '' };
	let showForm = false;

	// Fetch all categories
	async function fetchCategories() {
		try {
			const res = await fetch('/api/db/categorias-incidencias');
			const data = await res.json();

			if (res.ok && data.status === 'success') {
				categories = data.data;
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
				body: JSON.stringify(currentCategory)
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
				body: JSON.stringify({ id })
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

	onMount(fetchCategories);
</script>

<!-- Template -->
<div class="min-h-screen bg-gray-100 p-6">
	<h1 class="mb-6 text-center text-3xl font-bold text-gray-800">Categorías de Incidencias</h1>

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
			Agregar Categoría
		</button>
	</div>

	<!-- Form -->
	{#if showForm}
		<div class="mx-auto mb-6 max-w-lg rounded bg-white px-8 py-6 shadow-md">
			<form on:submit|preventDefault={saveCategory}>
				<div class="grid grid-cols-1 gap-4">
					<div>
						<label for="categoria" class="block text-sm font-medium text-gray-700">Categoría</label>
						<input
							type="text"
							id="categoria"
							bind:value={currentCategory.categoria}
							required
							class="w-full rounded border px-3 py-2 focus:border-primary focus:ring-primary"
						/>
					</div>
					<div>
						<label for="descripcion" class="block text-sm font-medium text-gray-700"
							>Descripción</label
						>
						<textarea
							id="descripcion"
							bind:value={currentCategory.descripcion}
							class="w-full rounded border px-3 py-2 focus:border-primary focus:ring-primary"
						></textarea>
					</div>
				</div>
				<div class="mt-4 flex justify-end space-x-4">
					<button
						type="button"
						on:click={resetForm}
						class="rounded bg-gray-300 px-4 py-2 font-bold text-gray-800 hover:bg-gray-400"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600"
					>
						{currentCategory.id ? 'Actualizar' : 'Crear'}
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Table -->
	<div class="overflow-x-auto rounded bg-white shadow-md">
		<table class="w-full table-auto border-collapse">
			<thead class="bg-gray-200 text-gray-700">
				<tr>
					<th class="border px-4 py-3">ID</th>
					<th class="border px-4 py-3">Categoría</th>
					<th class="border px-4 py-3">Descripción</th>
					<th class="border px-4 py-3 text-center">Acciones</th>
				</tr>
			</thead>
			<tbody class="text-gray-600">
				{#if categories.length > 0}
					{#each categories as category}
						<tr class="hover:bg-gray-50">
							<td class="border px-4 py-3">{category.id}</td>
							<td class="border px-4 py-3">{category.categoria}</td>
							<td class="border px-4 py-3">{category.descripcion}</td>
							<td class="flex justify-center space-x-2 border px-4 py-3 text-center">
								<button
									class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
									on:click={() => editCategory(category)}
								>
									Editar
								</button>
								<button
									class="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
									on:click={() => deleteCategory(category.id)}
								>
									Eliminar
								</button>
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="4" class="border px-4 py-3 text-center text-gray-500">
							No se encontraron categorías.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
