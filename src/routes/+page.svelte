<script>
  import { onMount } from 'svelte';
  import { addToast } from '$lib/stores/toast'; 
  
  let numero_telefono = '';
  let pin = '';


  // Focus the first input field on load
  onMount(() => {
    document.getElementById('numero_telefono').focus();
  });

  async function login() {

    // Validate inputs before sending request (Improved)
    if (!numero_telefono.trim() || !pin.trim()) {
      addToast('Por favor, complete todos los campos.', 'error');
      return;
    }

    // Validate phone number format
    if (!/^\d{8,15}$/.test(numero_telefono.trim())) {
      addToast('El número de teléfono debe contener solo dígitos (8-15 caracteres).', 'error');
      return;
    }

    // Validate PIN format
    if (pin.length < 4 || pin.length > 20) {
      addToast('El PIN debe tener entre 4 y 20 caracteres.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ numero_telefono, pin }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        if (result.data.user.debe_cambiar_pin) {
          addToast('Necesitas cambiar tu PIN. Redirigiendo...', 'warning');
          setTimeout(() => {
            window.location.href = '/change-pin';
          }, 1500);
          return;
        }

        addToast('Login exitoso! Redirigiendo...', 'success');
        setTimeout(() => {
          window.location.href = '/menu';
        }, 1500);
      } else {
        addToast(result.error?.message || 'Credenciales incorrectas. Intente nuevamente.', 'error');
      }
    } catch (err) {
      addToast('Un error ha ocurrido. Favor intente nuevamente.', 'error');
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
          type="tel"
          id="numero_telefono"
          bind:value={numero_telefono}
          placeholder="Ingrese su numero de teléfono"
          maxlength="15"
          pattern="[0-9]*"
          inputmode="numeric"
          class="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          required
          aria-describedby="telefono-help"
        />
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

  </div>
</div>