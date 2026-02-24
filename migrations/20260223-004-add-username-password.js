export const up = async (pgm) => {
	// Add new auth columns (guarded)
	await pgm.db.query(`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios' AND column_name = 'username'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN username text;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN password_hash char(60);
    END IF;
END$$;
`);

	// Backfill username and password_hash from existing phone/PIN hashes
	await pgm.db.query(
		`UPDATE usuarios
		 SET username = LOWER(numero_telefono),
		     password_hash = pin_hash
		 WHERE username IS NULL OR password_hash IS NULL`
	);

	// Enforce constraints after backfill
	await pgm.db.query(`ALTER TABLE usuarios ALTER COLUMN username SET NOT NULL`);
	await pgm.db.query(`ALTER TABLE usuarios ALTER COLUMN password_hash SET NOT NULL`);
	await pgm.db.query(
		`DO $$
		BEGIN
		    IF NOT EXISTS (
		        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_username_key'
		    ) THEN
		        ALTER TABLE usuarios ADD CONSTRAINT usuarios_username_key UNIQUE (username);
		    END IF;
		END$$;`
	);
};

export const down = async (pgm) => {
	await pgm.db.query(
		`DO $$
		BEGIN
		    IF EXISTS (
		        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_username_key'
		    ) THEN
		        ALTER TABLE usuarios DROP CONSTRAINT usuarios_username_key;
		    END IF;
		END$$;`
	);
	await pgm.dropColumn('usuarios', 'password_hash');
	await pgm.dropColumn('usuarios', 'username');
};
