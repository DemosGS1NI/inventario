/**
 * Business logic utilities for admin inventory management
 * These functions handle calculations and data transformations
 */

/**
 * Calculates the difference between physical and system inventory
 * @param {number} inventario_sistema - System inventory count
 * @param {number} inventario_fisico - Physical inventory count
 * @param {string|null} fecha_inventario - Inventory date
 * @returns {string|number} - Difference or empty string if not counted
 */
export function calculateDiferencia(inventario_sistema, inventario_fisico, fecha_inventario) {
	if (fecha_inventario === null) {
		return '';
	} else {
		return inventario_fisico - inventario_sistema;
	}
}

/**
 * Determines the type of inventory difference
 * @param {number} inventario_sistema - System inventory count
 * @param {number} inventario_fisico - Physical inventory count
 * @param {string|null} fecha_inventario - Inventory date
 * @returns {string} - Difference type or empty string
 */
export function calculateTipoDiferencia(inventario_sistema, inventario_fisico, fecha_inventario) {
	const sistema = Number(inventario_sistema);
	const fisico = Number(inventario_fisico);

	if (fecha_inventario === null) {
		return '';
	}

	if (isNaN(sistema) || isNaN(fisico)) {
		return 'Error: Valores no numéricos';
	}

	const diferencia = sistema - fisico;

	if (diferencia > 0) {
		return 'Faltante';
	} else if (diferencia < 0) {
		return 'Sobrante';
	} else {
		return 'Sin Diferencia';
	}
}

/**
 * Gets formatted movement summary for display
 * @param {Object} movements - Movement data object
 * @param {number} movements.netMovimientos - Net movement total
 * @returns {Object} - Display object with text and CSS class
 */
export function getMovementSummary(movements) {
	if (!movements || movements.netMovimientos === 0) {
		return { display: '-', class: 'text-gray-600' };
	}

	const net = movements.netMovimientos;
	const sign = net > 0 ? '+' : '';
	const colorClass = net > 0 ? 'text-green-600' : 'text-red-600';

	return {
		display: `Net: ${sign}${net}`,
		class: colorClass
	};
}
