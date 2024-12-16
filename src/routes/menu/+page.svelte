<script>
  import { goto } from '$app/navigation';
  export let data;

  const { username, userRole } = data;

  import { menuOptions } from '$lib/menu.js';

  // Function to log out the user
  async function logout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        alert('Logged out successfully');
        goto('/login'); // Redirect to the login page
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
    logout, // Map 'logout' to the logout function
  };

  // Filter menu options based on the user's role
  $: visibleMenuOptions = menuOptions.filter(option => option.roles.includes(userRole));
</script>

<div class="bg-white shadow-lg rounded-lg p-6 w-full max-w-md mx-auto">
  <h2 class="text-2xl font-bold mb-6 text-center">Menú Principal</h2>
  <ul class="space-y-4">
    {#each visibleMenuOptions as option}
      <li>
        {#if option.action}
          <!-- Render a button for actions -->
          <button
            on:click={() => actions[option.action]()}
            class="block w-full text-center bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600"
          >
            {option.label}
          </button>
        {:else if option.href}
          <!-- Render a link for navigation -->
          <a
            href={option.href}
            class="block text-center bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            {option.label}
          </a>
        {/if}
      </li>
    {/each}
  </ul>
</div>
