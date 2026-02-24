import bcrypt from 'bcrypt';

export const up = async (pgm) => {
	// Ensure unique constraint on role name for conflict handling
	await pgm.db.query(`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'roles_nombre_rol_key'
    ) THEN
        ALTER TABLE roles ADD CONSTRAINT roles_nombre_rol_key UNIQUE (nombre_rol);
    END IF;
END$$;
`);

	// Ensure unique constraint on role name for conflict handling
	await pgm.db.query(`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'roles_nombre_rol_key'
    ) THEN
        ALTER TABLE roles ADD CONSTRAINT roles_nombre_rol_key UNIQUE (nombre_rol);
    END IF;
END$$;
`);

	// Create admin role if not exists and capture id
	const roleRes = await pgm.db.query(
		`INSERT INTO roles (nombre_rol, descripcion)
		 VALUES ($1, $2)
		 ON CONFLICT (nombre_rol) DO UPDATE SET descripcion = EXCLUDED.descripcion
		 RETURNING id`,
		['admin', 'Administrator role']
	);

	const roleId = roleRes.rows[0].id;

	// Seed admin user if not exists
	const adminPhone = '99999999';
	const adminPin = 'admin';
	const pinHash = await bcrypt.hash(adminPin, 12);
	const adminUsername = 'admin';

	await pgm.db.query(
		`INSERT INTO usuarios (
			numero_telefono,
			pin_hash,
			username,
			password_hash,
			nombre,
			apellido,
			rol_id,
			activo,
			debe_cambiar_pin
		) VALUES ($1, $2, $3, $4, $5, $6, $7, true, false)
		ON CONFLICT (numero_telefono) DO NOTHING`,
		[adminPhone, pinHash, adminUsername, pinHash, 'Admin', 'User', roleId]
	);
};

export const down = async (pgm) => {
	const adminPhone = '99999999';
	await pgm.db.query('DELETE FROM usuarios WHERE numero_telefono = $1', [adminPhone]);
	await pgm.db.query("DELETE FROM roles WHERE nombre_rol = 'admin'");
};
