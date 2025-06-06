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

  // Group menu options by category with collapsed state and colors
  let categories = writable([
    {
      id: 'inventory',
      name: 'Inventario',
      icon: 'clipboard-list',
      color: 'blue',
      bgColor: 'bg-blue-500',
      hoverBgColor: 'hover:bg-blue-600',
      lightBgColor: 'bg-blue-50',
      hoverLightBgColor: 'hover:bg-blue-100',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-500',
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
      color: 'green',
      bgColor: 'bg-green-500',
      hoverBgColor: 'hover:bg-green-600',
      lightBgColor: 'bg-green-50',
      hoverLightBgColor: 'hover:bg-green-100',
      borderColor: 'border-green-200',
      textColor: 'text-green-500',
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
      color: 'purple',
      bgColor: 'bg-purple-500',
      hoverBgColor: 'hover:bg-purple-600',
      lightBgColor: 'bg-purple-50',
      hoverLightBgColor: 'hover:bg-purple-100',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-500',
      options: [
        'Usuarios',
        'Roles',
        'Categorias de Incidencias',
        'Limpieza de Tablas',
        'Limpieza de Tokens Vencidos'  // New option added
      ],
      isOpen: false
    },
    {
      id: 'account',
      name: 'Cuenta',
      icon: 'user',
      color: 'amber',
      bgColor: 'bg-amber-500',
      hoverBgColor: 'hover:bg-amber-600',
      lightBgColor: 'bg-amber-50',
      hoverLightBgColor: 'hover:bg-amber-100',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-500',
      options: [
        'Cambiar PIN',
        'Salir del Sistema'
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
  <div class="space-y-6">
    {#each $categories as category}
      <!-- Only show category if it has visible options for this user -->
      {@const categoryOptions = category.options.filter(label => visibleMenuOptions.some(opt => opt.label === label))}
      {#if categoryOptions.length > 0}
        <div class="rounded-xl shadow-sm overflow-hidden">
          <!-- Category Header (Always visible) -->
          <button 
            on:click={() => toggleCategory(category.id)}
            class="w-full p-4 flex items-center justify-between text-left focus:outline-none {category.bgColor} text-white hover:shadow-md transition-all duration-200"
          >
            <div class="flex items-center">
              <span class="inline-flex items-center justify-center w-10 h-10 bg-white {category.textColor} rounded-lg mr-3 shadow">
                <!-- Use simple Unicode icons as a lightweight solution -->
                {#if category.icon === 'clipboard-list'}
                  <span class="text-xl">📋</span>
                {:else if category.icon === 'database'}
                  <span class="text-xl">📊</span>
                {:else if category.icon === 'cog'}
                  <span class="text-xl">⚙️</span>
                {:else if category.icon === 'user'}
                  <span class="text-xl">👤</span>
                {/if}
              </span>
              <h2 class="text-lg font-semibold">{category.name}</h2>
            </div>
            <!-- Chevron indicator -->
            <span class="text-white transition-transform duration-300 transform {category.isOpen ? 'rotate-180' : ''}">
              ▼
            </span>
          </button>
          
          <!-- Category Options (Collapsible) -->
          {#if category.isOpen}
            <div class="transition-all duration-300 ease-in-out border border-t-0 {category.borderColor} {category.lightBgColor} rounded-b-xl">
              <div class="p-4 grid gap-3">
                {#each categoryOptions as optionLabel}
                  {@const option = findMenuOption(optionLabel)}
                  {#if option}
                    <button 
                      on:click={() => handleMenuClick(option.label)}
                      class="w-full py-3 px-4 text-left rounded-lg bg-white {category.hoverLightBgColor} flex justify-between items-center transition-colors border {category.borderColor} focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-{category.color}-500"
                    >
                      <span class="font-medium text-gray-700">{option.label}</span>
                      <span class="{category.textColor}">
                        {#if option.action}
                          <span>⚙️</span>
                        {:else}
                          <span>➡️</span>
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
    background-image: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
  }
  
  /* Add subtle animation to the chevron indicator */
  button span.transform {
    transition: transform 0.2s ease;
  }
</style>