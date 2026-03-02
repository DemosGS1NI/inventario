export const up = async (pgm) => {
	// Ensure DUN14 is the unquoted lowercase column name
	pgm.sql('ALTER TABLE inventario RENAME COLUMN "DUN14" TO dun14');
};

export const down = async (pgm) => {
	// Revert back to quoted uppercase if needed
	pgm.sql('ALTER TABLE inventario RENAME COLUMN dun14 TO "DUN14"');
};
