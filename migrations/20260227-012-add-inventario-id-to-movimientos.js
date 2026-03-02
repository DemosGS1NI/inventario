// Add inventario_id foreign key to movimientos to link movements to inventory rows
// Existing movimientos will keep inventario_id null until backfilled.

export const up = async (pgm) => {
	// Ensure inventario.id can be referenced directly (original PK is composite)
	pgm.createIndex('inventario', ['id'], { unique: true, ifNotExists: true, name: 'inventario_id_unique_idx' });

	pgm.addColumn('movimientos', {
		inventario_id: {
			type: 'integer',
			references: 'inventario(id)',
			onDelete: 'SET NULL'
		}
	});

	pgm.createIndex('movimientos', 'inventario_id');
};

export const down = async (pgm) => {
	pgm.dropIndex('movimientos', 'inventario_id');
	pgm.dropColumn('movimientos', 'inventario_id');
	pgm.dropIndex('inventario', ['id'], { name: 'inventario_id_unique_idx', ifExists: true });
};
