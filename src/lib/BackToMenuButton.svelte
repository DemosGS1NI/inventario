<script>
    import { goto } from '$app/navigation';

    function goToMainMenu() {
        goto('/');
    }
</script>

<button
    on:click={goToMainMenu}
    class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
>
    Regresar al Menu Principal
</button>
