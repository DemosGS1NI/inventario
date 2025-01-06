<!-- src/lib/components/Toast.svelte -->
<script>
    import { toastStore } from '$lib/stores/toast';
</script>

<div class="toast-container">
    {#each $toastStore as toast (toast.id)}
        <div class="toast {toast.type}">
            {toast.message}
        </div>
    {/each}
</div>

<style>
    .toast-container {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 1000;
    }

    .toast {
        padding: 1rem;
        margin-bottom: 0.5rem;
        border-radius: 0.25rem;
        color: white;
        animation: slideIn 0.2s ease-in;
    }

    .info {
        background-color: #3498db;
    }

    .success {
        background-color: #2ecc71;
    }

    .error {
        background-color: #e74c3c;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
        }
        to {
            transform: translateX(0);
        }
    }
</style>