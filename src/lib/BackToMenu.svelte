<script>
  import { goto } from '$app/navigation';

  // Allow a fallback URL to be passed in as a prop
  export let fallbackUrl = '/menu';

  function goToMainMenu() {
    // Use browser history if available, otherwise go to fallback
    if (document.referrer) {
      history.back();
    } else {
      goto(fallbackUrl);
    }
  }
</script>

<button
  on:click={goToMainMenu}
  class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded shadow-md mb-4"
>
  Regresar al Menu Principal
</button>
