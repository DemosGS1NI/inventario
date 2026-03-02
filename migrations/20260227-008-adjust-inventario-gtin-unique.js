export const up = async (pgm) => {

	// Move uniqueness to codigo+lote, tolerating prior constraint names
	pgm.sql('ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_codigo_barras_key');
	pgm.sql('ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_codigo_key');
	pgm.addConstraint('inventario', 'inventario_codigo_lote_key', { unique: ['codigo', 'lote'] });
};

export const down = async (pgm) => {
	// Revert composite uniqueness to codigo only
	pgm.dropConstraint('inventario', 'inventario_codigo_lote_key');
	pgm.addConstraint('inventario', 'inventario_codigo_key', { unique: ['codigo'] });

};
