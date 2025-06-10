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
	class="mb-4 rounded bg-gray-500 px-4 py-2 text-white shadow-md hover:bg-gray-600"
>
	Regresar al Menu Principal
</button>
