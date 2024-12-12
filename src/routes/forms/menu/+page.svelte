<script>
  export let userRole ; // Role passed from the load function

  // Define all menu options with their accessible roles
  const menuOptions = [
    { label: 'Carga Datos desde Archivo Excel', href: '/carga-datos-excel', roles: ['Admin', 'Supervisor'] },
    { label: 'Toma de Inventario', href: '/toma-inventario', roles: ['Admin', 'Supervisor', 'Inventario'] },
    { label: 'Descargar Datos a Archivo Excel', action: downloadExcel, roles: ['Admin', 'Supervisor'] },
    { label: 'Reporte de Resultado de Carga Excel', href: '/reporte-carga-excel', roles: ['Admin', 'Supervisor'] },
    { label: 'Administracion de Toma de Inventario', href: '/admin-inventario', roles: ['Admin', 'Supervisor'] },
    { label: 'Categorias de Incidencias', href: '/categorias-incidencias', roles: ['Admin', 'Supervisor'] },
    { label: 'Usuarios', href: '../forms/usuarios', roles: ['Admin'] },
    { label: 'Roles', href: '../forms/roles', roles: ['Admin'] },
    { label: 'Change PIN', href: '../forms/change-pin', roles: ['Admin', 'Inventario', 'Supervisor'] },
    { label: 'Logout', href: '../api/auth/logout', roles: ['Admin', 'Inventario', 'Supervisor'] },
  ];

  // Filter menu options based on the user's role
  $: visibleMenuOptions = menuOptions.filter(option => {
    if (!option.roles) return false;
    return option.roles.includes(userRole);
  });
  
 

  // Download Excel function
  async function downloadExcel() {
    try {
      const response = await fetch('/api/download-excel');
      if (!response.ok) {
        throw new Error('Error downloading the Excel file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition').split('filename=')[1];
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading Excel:', error);
    }
  }

  console.log('User Role:', userRole); // Debug userRole
  $: console.log('Visible Menu Options:', visibleMenuOptions); // Debug menu options
</script>

<div class="flex flex-col items-center min-h-screen bg-gray-100">
  <div class="bg-white p-6 rounded-lg shadow-md w-full max-w-md mt-20">
    <h2 class="text-2xl font-bold mb-4 text-center">Menu</h2>
    <ul class="space-y-3">
      {#each visibleMenuOptions as option}
        <li>
          {#if option.href}
            <a
              href={option.href}
              class="block text-center bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
            >
              {option.label}
            </a>
          {:else if option.action}
            <button
              on:click={option.action}
              class="block text-center w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
            >
              {option.label}
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</div>
