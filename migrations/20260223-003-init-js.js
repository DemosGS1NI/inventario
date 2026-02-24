export const up = async (pgm) => {
	await pgm.sql(`
CREATE TABLE IF NOT EXISTS roles (
    id SMALLSERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por SMALLINT
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SMALLSERIAL PRIMARY KEY,
    numero_telefono CHAR(10) NOT NULL UNIQUE,
    pin_hash CHAR(60) NOT NULL,
    nombre VARCHAR(50),
    apellido VARCHAR(50),
    rol_id SMALLINT REFERENCES roles(id),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    debe_cambiar_pin BOOLEAN DEFAULT FALSE,
    created_by SMALLINT,
    updated_by SMALLINT
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'roles_creado_por_fkey'
    ) THEN
        ALTER TABLE roles
            ADD CONSTRAINT roles_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_created_by_fkey'
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_created_by_fkey FOREIGN KEY (created_by) REFERENCES usuarios(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_updated_by_fkey'
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES usuarios(id);
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti VARCHAR(255) PRIMARY KEY,
    expiry TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias_incidencias (
    id SERIAL PRIMARY KEY,
    categoria TEXT NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS inventario (
    id NUMERIC NOT NULL,
    codigo_barras TEXT NOT NULL,
    gtin TEXT,
    bodega TEXT NOT NULL,
    ubicacion TEXT,
    marca TEXT,
    numero_parte TEXT,
    descripcion TEXT,
    inventario_sistema NUMERIC,
    inventario_fisico NUMERIC,
    fecha_inventario TIMESTAMP,
    categoria_incidencia TEXT,
    incidencia TEXT,
    actualizado_por NUMERIC,
    validado BOOLEAN,
    validado_por NUMERIC,
    single_item_ean13 VARCHAR(20),
    master_carton_ean13 VARCHAR(20),
    PRIMARY KEY (id, bodega),
    UNIQUE (codigo_barras),
    UNIQUE (numero_parte),
    UNIQUE (single_item_ean13)
);

CREATE TABLE IF NOT EXISTS movimientos (
    id SERIAL PRIMARY KEY,
    bodega VARCHAR UNIQUE,
    ubicacion VARCHAR,
    marca VARCHAR UNIQUE,
    codigo_barras VARCHAR UNIQUE,
    numero_parte VARCHAR,
    descripcion VARCHAR,
    tipo_movimiento VARCHAR,
    cantidad INTEGER,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    numero_documento VARCHAR NOT NULL UNIQUE,
    comentarios TEXT,
    usuario_id INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES menu_categories(id),
    label VARCHAR(100) NOT NULL,
    href VARCHAR(255),
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS menu_item_roles (
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
    role_id INTEGER NOT NULL REFERENCES roles(id),
    PRIMARY KEY (menu_item_id, role_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    performed_by INTEGER NOT NULL REFERENCES usuarios(id),
    action_details TEXT,
    "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);
};

export const down = async (pgm) => {
	await pgm.sql(`
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_creado_por_fkey;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_created_by_fkey;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_updated_by_fkey;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_id_fkey;
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_performed_by_fkey;
ALTER TABLE menu_item_roles DROP CONSTRAINT IF EXISTS menu_item_roles_menu_item_id_fkey;
ALTER TABLE menu_item_roles DROP CONSTRAINT IF EXISTS menu_item_roles_role_id_fkey;
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;
ALTER TABLE movimientos DROP CONSTRAINT IF EXISTS movimientos_usuario_id_fkey;

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS menu_item_roles;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS menu_categories;
DROP TABLE IF EXISTS movimientos;
DROP TABLE IF EXISTS inventario;
DROP TABLE IF EXISTS categorias_incidencias;
DROP TABLE IF EXISTS revoked_tokens;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS roles;
`);
};
