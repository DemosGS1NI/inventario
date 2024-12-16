<script>
  import { onMount } from 'svelte';

  let numero_telefono = '';
  let pin = '';
  let message = '';
  let messageType = ''; // 'success' or 'error'

  // Focus the first input field on load
  onMount(() => {
    document.getElementById('numero_telefono').focus();
  });

  async function login() {
    message = ''; // Reset the message
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ numero_telefono, pin }),
      });

      const result = await response.json();

      if (!response.ok) {
        messageType = 'error';
        message = result.message || 'Credenciales incorrectas. Intente nuevamente.';
        return;
      }

      if (result.user.debe_cambiar_pin) {
        messageType = 'success';
        message = 'Necesitas cambiar tu PIN.';
        window.location.href = '/change-pin'; // Redirect to "Change PIN" page
        return;
      }

      messageType = 'success';
      message = result.message || 'Login satisfactorio!';
      window.location.href = '/menu'; // Redirect to the dashboard after successful login
    } catch (err) {
      messageType = 'error';
      message = 'Un error ha ocurrido. Favor intente nuevamente.';
    }
  }
</script>

<div class="flex items-center justify-center min-h-screen bg-gray-100">
  <div class="bg-white shadow-lg rounded-lg p-6 max-w-sm w-full">
    <h2 class="text-2xl font-bold text-center mb-6 text-gray-800">Login</h2>

    <form on:submit|preventDefault={login} class="space-y-4" aria-live="polite">
      <div>
        <label
          for="numero_telefono"
          class="block text-sm font-medium text-gray-700"
        >
          Numero de Teléfono
        </label>
        <input
          type="text"
          id="numero_telefono"
          bind:value={numero_telefono}
          placeholder="Ingrese su numero de teléfono"
          class="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          required
          aria-describedby="telefono-help"
        />
        <small id="telefono-help" class="text-gray-500">
          Ejemplo: 88888888
        </small>
      </div>

      <div>
        <label for="pin" class="block text-sm font-medium text-gray-700">PIN</label>
        <input
          type="password"
          id="pin"
          bind:value={pin}
          placeholder="Ingrese su PIN"
          class="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          required
          autocomplete="off"
        />
      </div>

      <button
        type="submit"
        class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Login
      </button>
    </form>

    {#if message}
      <p
        class="mt-4 text-center text-sm font-medium"
        class:text-green-600={messageType === 'success'}
        class:text-red-600={messageType === 'error'}
      >
        {message}
      </p>
    {/if}
  </div>
</div>
