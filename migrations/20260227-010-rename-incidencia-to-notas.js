export const up = async (pgm) => {
	// Rename incidencia -> notas in inventario
	pgm.renameColumn('inventario', 'incidencia', 'notas');
};

export const down = async (pgm) => {
	// Revert notas -> incidencia
	pgm.renameColumn('inventario', 'notas', 'incidencia');
};
