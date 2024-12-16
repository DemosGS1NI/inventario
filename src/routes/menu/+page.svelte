<script>
  export let data;

  const { username, userRole } = data;

  import { menuOptions } from '$lib/menu.js';

  // Filter menu options based on the user's role
  $: visibleMenuOptions = menuOptions.filter(option => option.roles.includes(userRole));
</script>

<div class="bg-white shadow-lg rounded-lg p-6 w-full max-w-md mx-auto">
  <h2 class="text-2xl font-bold mb-6 text-center">Menú Principal</h2>
  <ul class="space-y-4">
    {#each visibleMenuOptions as option}
      <li>
        {#if option.href}
          <a
            href={option.href}
            class="block text-center bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            {option.label}
          </a>
        {:else if option.dynamic}
          <button
            on:click={actions[option.dynamic]}
            class="block w-full text-center bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            {option.label}
          </button>
        {/if}
      </li>
    {/each}
  </ul>
</div>
