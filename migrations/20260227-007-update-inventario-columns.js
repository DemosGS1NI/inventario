export const up = async (pgm) => {
	// Add new columns after numero_parte (logical order; PostgreSQL does not enforce display order)
	pgm.addColumns('inventario', {
		lote: { type: 'varchar(40)' },
		unidad_medida: { type: 'varchar(20)' },
		tare: { type: 'numeric(10,2)' }
	});

	// Rename existing columns
	pgm.renameColumn('inventario', 'codigo_barras', 'codigo');
	pgm.renameColumn('inventario', 'master_carton_ean13', 'DUN14');

	// Drop redundant GTIN13/single_item_ean13 because table already has gtin
	
    pgm.sql('ALTER TABLE inventario DROP COLUMN IF EXISTS single_item_ean13');
    pgm.sql('ALTER TABLE inventario DROP COLUMN IF EXISTS "GTIN13"');

	// Shift uniqueness from codigo to composite codigo+lote
	pgm.sql('ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_codigo_barras_key');
	pgm.sql('ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_codigo_key');
	pgm.addConstraint('inventario', 'inventario_codigo_lote_key', { unique: ['codigo', 'lote'] });
};

export const down = async (pgm) => {
	// Restore original uniqueness on codigo and remove composite
	pgm.dropConstraint('inventario', 'inventario_codigo_lote_key');
	pgm.addConstraint('inventario', 'inventario_codigo_key', { unique: ['codigo'] });

	// Recreate dropped GTIN13 (single_item_ean13)
	pgm.addColumn('inventario', {
		single_item_ean13: { type: 'varchar(20)', unique: true }
	});

	// Revert column names
	pgm.renameColumn('inventario', 'codigo', 'codigo_barras');
	pgm.renameColumn('inventario', 'DUN14', 'master_carton_ean13');

	// Drop newly added columns
	pgm.dropColumns('inventario', ['lote', 'unidad_medida', 'tare']);
};
