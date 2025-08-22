<!-- src/routes/menu/+page.svelte -->
<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	export let data;

	// Destructure user data
	const { userId, userName, userRole } = data;

	// Store for menu data
	let menu = {};
	let loading = true;
	let error = null;

	// Store for category states
	const categoryStates = writable({});

	// Color palettes for categories
	const colorPalettes = {
		Inventario: {
			bgColor: 'bg-blue-500',
			hoverBgColor: 'hover:bg-blue-600',
			lightBgColor: 'bg-blue-50',
			hoverLightBgColor: 'hover:bg-blue-100',
			borderColor: 'border-blue-200',
			textColor: 'text-blue-500',
			icon: '📋'
		},
		Datos: {
			bgColor: 'bg-green-500',
			hoverBgColor: 'hover:bg-green-600',
			lightBgColor: 'bg-green-50',
			hoverLightBgColor: 'hover:bg-green-100',
			borderColor: 'border-green-200',
			textColor: 'text-green-500',
			icon: '📊'
		},
		Administración: {
			bgColor: 'bg-purple-500',
			hoverBgColor: 'hover:bg-purple-600',
			lightBgColor: 'bg-purple-50',
			hoverLightBgColor: 'hover:bg-purple-100',
			borderColor: 'border-purple-200',
			textColor: 'text-purple-500',
			icon: '⚙️'
		},
		Cuenta: {
			bgColor: 'bg-amber-500',
			hoverBgColor: 'hover:bg-amber-600',
			lightBgColor: 'bg-amber-50',
			hoverLightBgColor: 'hover:bg-amber-100',
			borderColor: 'border-amber-200',
			textColor: 'text-amber-500',
			icon: '👤'
		}
	};

	// Function to toggle category
	function toggleCategory(category) {
		categoryStates.update((states) => ({
			...states,
			[category]: !states[category]
		}));
	}

	// Function to log out the user
	async function logout() {
		try {
			// Clean menu cache
			localStorage.removeItem(MENU_CACHE_KEY);

			// Optionally, clean any other session-related localStorage here

			const response = await fetch('/api/auth/logout', { method: 'POST' });
			if (response.ok) {
				alert('Logged out successfully');
				goto('/'); // Redirect to the login page
			} else {
				alert('Failed to log out. Please try again.');
			}
		} catch (error) {
			console.error('Error during logout:', error);
			alert('An error occurred during logout.');
		}
	}

	// Function to handle menu item click
	function handleMenuClick(href, label) {
		if (label === 'Salir del Sistema') {
			logout();
		} else if (href) {
			goto(href);
		}
	}

	// Load menu data
	// debido a que ahora se carga desde tablas es mejor hacer caching en vez de estar leyendo cada vez.
	const MENU_CACHE_KEY = 'menu_cache';
	const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

	onMount(async () => {
		try {
			// Check for cached menu first
			const cached = localStorage.getItem(MENU_CACHE_KEY);
			if (cached) {
				const { data, timestamp, userRole: cachedRole } = JSON.parse(cached);

				// Check if cache is still valid and for same user role
				if (Date.now() - timestamp < CACHE_DURATION && cachedRole === userRole) {
					menu = data;
					loading = false;

					// Initialize category states
					const initialState = {};
					Object.keys(menu).forEach((category) => {
						initialState[category] = false;
					});
					categoryStates.set(initialState);
					return; // Skip API call
				}
			}

			// If no valid cache, fetch from API
			const response = await fetch('/api/menu');
			const result = await response.json();

			if (result.status === 'error') {
				throw new Error(result.error.message);
			}

			menu = result.data;

			// Cache the result
			localStorage.setItem(
				MENU_CACHE_KEY,
				JSON.stringify({
					data: menu,
					timestamp: Date.now(),
					userRole: userRole
				})
			);

			// Initialize category states
			const initialState = {};
			Object.keys(menu).forEach((category) => {
				initialState[category] = false;
			});
			categoryStates.set(initialState);
		} catch (err) {
			error = err.message;
			console.error('Error loading menu:', err);
		} finally {
			loading = false;
		}
	});
</script>

<div class="min-h-screen bg-gray-100 p-4 md:p-8">
	<!-- Header with user info -->
	<header class="mb-8">
		<div class="relative overflow-hidden rounded-xl bg-white p-6 shadow-md md:p-8">
			<div
				class="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-blue-500 opacity-10 md:h-32 md:w-32"
			></div>
			<div class="relative z-10">
				<h1 class="text-2xl font-bold text-gray-800 md:text-3xl">Toma de Inventario</h1>
				<p class="mt-1 text-gray-600">
					Bienvenido, {userName || 'Usuario'} - {userRole || 'Rol no definido'}
				</p>
			</div>
		</div>
	</header>

	{#if loading}
		<div class="flex h-64 items-center justify-center">
			<p class="text-lg">Loading menu...</p>
		</div>
	{:else if error}
		<div class="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{error}
		</div>
	{:else}
		<!-- Menu Categories -->
		<div class="space-y-6">
			{#each Object.entries(menu) as [category, items]}
				{@const palette = colorPalettes[category] || colorPalettes['Inventario']}
				<div class="overflow-hidden rounded-xl shadow-sm">
					<!-- Category Header -->
					<button
						on:click={() => toggleCategory(category)}
						class="flex w-full items-center justify-between p-4 text-left focus:outline-none {palette.bgColor} text-white transition-all duration-200 hover:shadow-md"
					>
						<div class="flex items-center">
							<span
								class="inline-flex h-10 w-10 items-center justify-center bg-white {palette.textColor} mr-3 rounded-lg shadow"
							>
								<span class="text-xl">{palette.icon}</span>
							</span>
							<h2 class="text-lg font-semibold">{category}</h2>
						</div>
						<!-- Chevron indicator -->
						<span
							class="transform text-white transition-transform duration-300 {$categoryStates[
								category
							]
								? 'rotate-180'
								: ''}"
						>
							▼
						</span>
					</button>

					<!-- Category Items (Collapsible) -->
					{#if $categoryStates[category]}
						<div
							class="border border-t-0 transition-all duration-300 ease-in-out {palette.borderColor} {palette.lightBgColor} rounded-b-xl"
						>
							<div class="grid gap-3 p-4">
								{#each items as item}
									<button
										on:click={() => handleMenuClick(item.href, item.label)}
										class="w-full rounded-lg bg-white px-4 py-3 text-left {palette.hoverLightBgColor} flex items-center justify-between border transition-colors {palette.borderColor} focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-{palette.textColor.split(
											'-'
										)[1]}"
									>
										<span class="font-medium text-gray-700">{item.label}</span>
										<span class={palette.textColor}>
											{#if item.label === 'Salir del Sistema'}
												<span>⚙️</span>
											{:else}
												<span>➡️</span>
											{/if}
										</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Footer with version info -->
	<footer class="mt-8 pt-6 text-center text-sm text-gray-500">
		<p>Toma de Inventario &copy; 2025</p>
		<p class="mt-1 text-xs">v1.2.0</p>
	</footer>
</div>

<style>
	/* Add custom styles specific to menu */
	:global(.menu-page) {
		background-color: #f5f7fa;
		background-image: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
	}

	/* Add subtle animation to the chevron indicator */
	button span.transform {
		transition: transform 0.2s ease;
	}
</style>
