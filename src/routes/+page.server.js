// src/routes/+page.server.js
export async function load({ fetch }) {
    try {
      const [bodegasRes, categoriasRes] = await Promise.all([
        fetch('/api/bodegas'),
        fetch('/api/db/categorias-incidencias')
      ]);
  
      if (!bodegasRes.ok || !categoriasRes.ok) {
        throw new Error('Failed to fetch initial data');
      }
  
      const { data: bodegas } = await bodegasRes.json();
      const { data: categorias } = await categoriasRes.json();
  
      return {
        bodegas,
        categoriasIncidencias: categorias.map(item => item.categoria),
        // Add error/success messages if needed
        messages: { success: null, error: null }
      };
    } catch (error) {
      console.error('Load error:', error);
      return {
        bodegas: [],
        categoriasIncidencias: [],
        messages: { error: 'Error loading initial data' }
      };
    }
  }

  // src/routes/+page.server.js
export const actions = {
    saveInventory: async ({ request }) => {
      try {
        const formData = await request.formData();
        const data = Object.fromEntries(formData);
        
        const response = await fetch('/api/producto', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
  
        if (!response.ok) {
          return { success: false, error: 'Failed to save inventory' };
        }
  
        return { success: true };
      } catch (error) {
        console.error('Save error:', error);
        return { success: false, error: 'Unexpected error saving inventory' };
      }
    }
  };