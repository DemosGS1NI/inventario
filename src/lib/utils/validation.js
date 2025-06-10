// src/lib/utils/validation.js
export function validateInventoryForm(data) {
	const errors = {};

	if (!data.bodega) {
		errors.bodega = 'La bodega es requerida';
	}

	if (!data.marca) {
		errors.marca = 'La marca es requerida';
	}

	if (!data.ubicacion) {
		errors.ubicacion = 'La ubicación es requerida';
	}

	if (!data.codigo_barras) {
		errors.codigo_barras = 'El código de barras es requerido';
	}

	if (data.inventario_fisico < 0) {
		errors.inventario_fisico = 'El inventario físico no puede ser negativo';
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors
	};
}
