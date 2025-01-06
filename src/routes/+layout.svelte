<script>
	export let data;
  
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

    injectSpeedInsights();

	import Toast from '$lib/components/Toast.svelte';

	// Access user-related data if needed
	const { userName, userRole } = data;
  </script>
  
  <!-- Load Global CSS -->
  <style>
	@import '../app.css';
  </style>
  
  <div class="flex flex-col min-h-screen">
	<!-- Main Content -->
	<main class="flex-grow">
  		<Toast />	
	  <slot />
	</main>
  </div>
  