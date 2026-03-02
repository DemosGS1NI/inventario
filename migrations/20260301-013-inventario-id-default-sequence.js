export const up = async (pgm) => {
	// Create sequence and set default so missing IDs auto-generate
	pgm.createSequence('inventario_id_seq', { temporary: false, ifNotExists: true });

	// Align sequence with current max(id) to avoid collisions
	pgm.sql(`
		SELECT setval(
			'inventario_id_seq'::regclass,
			COALESCE((SELECT MAX(id) FROM inventario), 0)::bigint,
			true
		);
	`);

	// Set default on inventario.id to use the sequence
	pgm.alterColumn('inventario', 'id', {
		default: pgm.func('nextval(\'inventario_id_seq\')')
	});
};

export const down = async (pgm) => {
	// Remove default and drop sequence to revert to manual IDs
	pgm.alterColumn('inventario', 'id', { default: null });
	pgm.dropSequence('inventario_id_seq', { ifExists: true });
};
