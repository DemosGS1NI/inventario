export const up = async (pgm) => {
	// Drop GTIN13 column (redundant; legacy GTIN already exists)
	// Move uniqueness to composite codigo + lote, tolerating prior constraint names
	pgm.sql('ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_codigo_lote_key');
	pgm.sql('ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_codigo_barras_key');
	pgm.sql('ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_codigo_key');
	pgm.addConstraint('inventario', 'inventario_codigo_lote_key', { unique: ['codigo', 'lote'] });
};

export const down = async (pgm) => {
	// Restore uniqueness on codigo only and drop the composite
	pgm.sql('ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_codigo_lote_key');
	pgm.addConstraint('inventario', 'inventario_codigo_key', { unique: ['codigo'] });

};
