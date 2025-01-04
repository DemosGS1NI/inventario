<script>
  import { goto } from '$app/navigation'; // Import the goto function
  import BackToMenu from '$lib/BackToMenu.svelte';

  let newPin = '';
  let confirmNewPin = '';
  let errorMessage = '';

  const validateInputs = () => {
    // Trim inputs to avoid blank spaces
    newPin = newPin.trim();
    confirmNewPin = confirmNewPin.trim();

    // Check for empty inputs
    if (!newPin || !confirmNewPin) {
      errorMessage = 'Todos los campos son obligatorios.';
      return false;
    }

    // Check for mismatched PINs
    if (newPin !== confirmNewPin) {
      errorMessage = 'Los PINs no coinciden.';
      return false;
    }

    // Clear error if everything is valid
    errorMessage = '';
    return true;
  };

  const changePin = async () => {
    // Validate inputs before sending request
    if (!validateInputs()) return;

    try {
      
      console.log(newPin, confirmNewPin);

      const response = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPin,
          confirmNewPin,
        }),
      });

      if (response.ok) {
        alert('¡PIN ha sido cambiado satisfactoriamente!');
        goto('/menu'); // Redirect to menu
      } else {
        const data = await response.json();
        errorMessage = data.message || 'Error al cambiar el PIN.';
      }
    } catch (error) {
      errorMessage = 'Ocurrió un error inesperado. Por favor, inténtelo más tarde.';
    }
  };
</script>

<div class="flex justify-center items-center min-h-screen bg-gray-100">
  <form
    class="bg-white p-6 rounded-lg shadow-md w-full max-w-md"
    on:submit|preventDefault={changePin}
  >
    <h2 class="text-2xl font-bold mb-4 text-center">Cambiar PIN</h2>

    <BackToMenu />

    <div class="mb-4">
      <label for="newPin" class="block text-gray-700 font-medium mb-2">
        Ingrese su nuevo PIN:
      </label>
      <input
        type="password"
        id="newPin"
        class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        bind:value={newPin}
      />
    </div>
    <div class="mb-4">
      <label for="confirmNewPin" class="block text-gray-700 font-medium mb-2">
        Confirme su nuevo PIN:
      </label>
      <input
        type="password"
        id="confirmNewPin"
        class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        bind:value={confirmNewPin}
      />
    </div>
    {#if errorMessage}
      <p class="text-red-500 text-sm mb-4">{errorMessage}</p>
    {/if}
    <button
      type="submit"
      class="w-full bg-blue-500 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-600"
    >
      Cambiar PIN
    </button>
  </form>
</div>
