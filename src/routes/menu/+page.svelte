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
    'Inventario': {
      bgColor: 'bg-blue-500',
      hoverBgColor: 'hover:bg-blue-600',
      lightBgColor: 'bg-blue-50',
      hoverLightBgColor: 'hover:bg-blue-100',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-500',
      icon: '📋'
    },
    'Datos': {
      bgColor: 'bg-green-500',
      hoverBgColor: 'hover:bg-green-600',
      lightBgColor: 'bg-green-50',
      hoverLightBgColor: 'hover:bg-green-100',
      borderColor: 'border-green-200',
      textColor: 'text-green-500',
      icon: '📊'
    },
    'Administración': {
      bgColor: 'bg-purple-500',
      hoverBgColor: 'hover:bg-purple-600',
      lightBgColor: 'bg-purple-50',
      hoverLightBgColor: 'hover:bg-purple-100',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-500',
      icon: '⚙️'
    },
    'Cuenta': {
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
    categoryStates.update(states => ({
      ...states,
      [category]: !states[category]
    }));
  }

  // Function to log out the user
  async function logout() {
    try {
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
  onMount(async () => {
    try {
      const response = await fetch('/api/menu');
      const result = await response.json();
      
      if (result.status === 'error') {
        throw new Error(result.error.message);
      }
      
      menu = result.data;
      
      // Initialize all categories as closed
      const initialState = {};
      Object.keys(menu).forEach(category => {
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
    <div class="bg-white rounded-xl shadow-md p-6 md:p-8 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-blue-500 rounded-bl-full opacity-10"></div>
      <div class="z-10 relative">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-800">Toma de Inventario</h1>
        <p class="text-gray-600 mt-1">Bienvenido, {userName || 'Usuario'} - {userRole || 'Rol no definido'}</p>
      </div>
    </div>
  </header>

  {#if loading}
    <div class="flex justify-center items-center h-64">
      <p class="text-lg">Loading menu...</p>
    </div>
  {:else if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      {error}
    </div>
  {:else}
    <!-- Menu Categories -->
    <div class="space-y-6">
      {#each Object.entries(menu) as [category, items]}
        {@const palette = colorPalettes[category] || colorPalettes['Inventario']}
        <div class="rounded-xl shadow-sm overflow-hidden">
          <!-- Category Header -->
          <button 
            on:click={() => toggleCategory(category)}
            class="w-full p-4 flex items-center justify-between text-left focus:outline-none {palette.bgColor} text-white hover:shadow-md transition-all duration-200"
          >
            <div class="flex items-center">
              <span class="inline-flex items-center justify-center w-10 h-10 bg-white {palette.textColor} rounded-lg mr-3 shadow">
                <span class="text-xl">{palette.icon}</span>
              </span>
              <h2 class="text-lg font-semibold">{category}</h2>
            </div>
            <!-- Chevron indicator -->
            <span class="text-white transition-transform duration-300 transform {$categoryStates[category] ? 'rotate-180' : ''}">
              ▼
            </span>
          </button>
          
          <!-- Category Items (Collapsible) -->
          {#if $categoryStates[category]}
            <div class="transition-all duration-300 ease-in-out border border-t-0 {palette.borderColor} {palette.lightBgColor} rounded-b-xl">
              <div class="p-4 grid gap-3">
                {#each items as item}
                  <button 
                    on:click={() => handleMenuClick(item.href, item.label)}
                    class="w-full py-3 px-4 text-left rounded-lg bg-white {palette.hoverLightBgColor} flex justify-between items-center transition-colors border {palette.borderColor} focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-{palette.textColor.split('-')[1]}"
                  >
                    <span class="font-medium text-gray-700">{item.label}</span>
                    <span class="{palette.textColor}">
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
    <p class="text-xs mt-1">v1.2.0</p>
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