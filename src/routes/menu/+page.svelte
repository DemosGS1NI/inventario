<!-- src/routes/menu/+page.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  export let data;

  // Destructure user data
  const { userId, userName, userRole } = data;

  // Import menu options
  import { menuOptions } from '$lib/menu.js';

  // Group menu options by category with collapsed state
  let categories = writable([
    {
      id: 'inventory',
      name: 'Inventario',
      icon: 'clipboard-list',
      options: [
        'Toma de Inventario',
        'Toma de Inventario por Marca',
        'Toma de Inventario por Producto',
        'Toma de Inventario con Scanner',
        'Administracion de Toma de Inventario'
      ],
      isOpen: false
    },
    {
      id: 'data',
      name: 'Datos',
      icon: 'database',
      options: [
        'Carga Datos desde Archivo Excel',
        'Reporte de Resultado de Carga Excel',
        'Descargar Datos a Archivo Excel'
      ],
      isOpen: false
    },
    {
      id: 'admin',
      name: 'Administración',
      icon: 'cog',
      options: [
        'Usuarios',
        'Roles',
        'Categorias de Incidencias',
        'Limpieza de Tablas'
      ],
      isOpen: false
    },
    {
      id: 'account',
      name: 'Cuenta',
      icon: 'user',
      options: [
        'Cambiar PIN',
        'Log out'
      ],
      isOpen: false
    }
  ]);

  // Filter menu options based on the user's role
  $: visibleMenuOptions = menuOptions.filter(option => option.roles.includes(userRole));

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

  // Map of actions for dynamic handling
  const actions = {
    logout // Map 'logout' to the logout function
  };

  // Function to find menu option by label
  function findMenuOption(label) {
    return visibleMenuOptions.find(option => option.label === label);
  }

  // Function to handle menu item click
  function handleMenuClick(label) {
    const option = findMenuOption(label);
    if (!option) return;
    
    if (option.action) {
      actions[option.action]();
    } else if (option.href) {
      goto(option.href);
    }
  }
  
  // Function to toggle category open/closed
  function toggleCategory(categoryId) {
    categories.update(cats => {
      return cats.map(category => ({
        ...category,
        isOpen: category.id === categoryId ? !category.isOpen : category.isOpen
      }));
    });
  }
  
  // Set body background for menu page
  onMount(() => {
    document.body.classList.add('menu-page');
    return () => {
      document.body.classList.remove('menu-page');
    };
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

  <!-- Collapsible Menu Categories -->
  <div class="space-y-4">
    {#each $categories as category}
      <!-- Only show category if it has visible options for this user -->
      {@const categoryOptions = category.options.filter(label => visibleMenuOptions.some(opt => opt.label === label))}
      {#if categoryOptions.length > 0}
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
          <!-- Category Header (Always visible) -->
          <button 
            on:click={() => toggleCategory(category.id)}
            class="w-full p-4 flex items-center justify-between text-left focus:outline-none focus:bg-blue-50"
          >
            <div class="flex items-center">
              <span class="inline-flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-lg mr-3">
                <!-- Use simple Unicode icons as a lightweight solution -->
                {#if category.icon === 'clipboard-list'}
                  <span>📋</span>
                {:else if category.icon === 'database'}
                  <span>📊</span>
                {:else if category.icon === 'cog'}
                  <span>⚙️</span>
                {:else if category.icon === 'user'}
                  <span>👤</span>
                {/if}
              </span>
              <h2 class="text-lg font-semibold text-gray-800">{category.name}</h2>
            </div>
            <!-- Chevron indicator -->
            <span class="text-blue-500 transition-transform duration-300 transform {category.isOpen ? 'rotate-180' : ''}">
              ▼
            </span>
          </button>
          
          <!-- Category Options (Collapsible) -->
          {#if category.isOpen}
            <div class="transition-all duration-300 ease-in-out border-t border-gray-100">
              <div class="p-4 grid gap-3">
                {#each categoryOptions as optionLabel}
                  {@const option = findMenuOption(optionLabel)}
                  {#if option}
                    <button 
                      on:click={() => handleMenuClick(option.label)}
                      class="w-full py-3 px-4 text-left rounded-lg bg-gray-50 hover:bg-blue-50 flex justify-between items-center transition-colors border border-gray-100 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    >
                      <span class="font-medium text-gray-700">{option.label}</span>
                      <span class="text-gray-400 text-sm">
                        {#if option.action}
                          <span class="text-blue-500">⚙️</span>
                        {:else}
                          <span class="text-blue-500">➡️</span>
                        {/if}
                      </span>
                    </button>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
  
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
  }
  
  /* Add subtle animation to the chevron indicator */
  button span.transform {
    transition: transform 0.2s ease;
  }
</style>