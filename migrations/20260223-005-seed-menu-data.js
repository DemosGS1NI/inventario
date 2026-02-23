export const up = async (pgm) => {
	// Seed roles (ids 1-3) and sync sequence
	const roles = [
		{ id: 1, nombre_rol: 'Admin', descripcion: 'Tiene acceso a todos las opciones del sistema' },
		{ id: 2, nombre_rol: 'Inventario', descripcion: 'Solamente tiene accesos a toma de inventario' },
		{ id: 3, nombre_rol: 'Supervisor', descripcion: 'Supervisor de la Aplicacion. Manejo de Reportes' }
	];

	for (const r of roles) {
		await pgm.db.query(
			`INSERT INTO roles (id, nombre_rol, descripcion)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (id) DO UPDATE SET nombre_rol = EXCLUDED.nombre_rol, descripcion = EXCLUDED.descripcion`,
			[r.id, r.nombre_rol, r.descripcion]
		);
	}
	await pgm.db.query(`SELECT setval('roles_id_seq', (SELECT COALESCE(MAX(id),1) FROM roles))`);

	// Seed menu categories
	const categories = [
		{ id: 1, name: 'Inventario', order_index: 1 },
		{ id: 2, name: 'Datos', order_index: 2 },
		{ id: 3, name: 'Administración', order_index: 3 },
		{ id: 4, name: 'Cuenta', order_index: 4 }
	];

	for (const c of categories) {
		await pgm.db.query(
			`INSERT INTO menu_categories (id, name, order_index)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, order_index = EXCLUDED.order_index`,
			[c.id, c.name, c.order_index]
		);
	}
	await pgm.db.query(`SELECT setval('menu_categories_id_seq', (SELECT COALESCE(MAX(id),1) FROM menu_categories))`);

	// Seed menu items
	const items = [
		{ id: 1, category_id: 1, label: 'Toma de Inventario', href: '/toma-inventario', order_index: 1, is_active: true },
		{ id: 2, category_id: 1, label: 'Toma de Inventario por Marca', href: '/toma-inventario-por-marca', order_index: 2, is_active: true },
		{ id: 4, category_id: 1, label: 'Administracion de Toma de Inventario', href: '/admin-inventario', order_index: 4, is_active: true },
		{ id: 5, category_id: 1, label: 'Gestión de Movimientos', href: '/movimientos', order_index: 5, is_active: true },
		{ id: 6, category_id: 1, label: 'Historial de Movimientos', href: '/movimientos/historial', order_index: 6, is_active: true },
		{ id: 7, category_id: 1, label: 'Reporte de Reconciliación', href: '/reconciliacion-inventario', order_index: 7, is_active: true },
		{ id: 8, category_id: 2, label: 'Carga Datos desde Archivo Excel', href: '/carga-datos-excel', order_index: 1, is_active: true },
		{ id: 9, category_id: 2, label: 'Reporte de Resultado de Carga Excel', href: '/reporte-carga-excel', order_index: 2, is_active: true },
		{ id: 10, category_id: 2, label: 'Descargar Datos a Archivo Excel', href: '/descarga-datos-excel', order_index: 3, is_active: true },
		{ id: 11, category_id: 3, label: 'Usuarios', href: '/usuarios', order_index: 1, is_active: true },
		{ id: 12, category_id: 3, label: 'Roles', href: '/roles', order_index: 2, is_active: true },
		{ id: 13, category_id: 3, label: 'Categorias de Incidencias', href: '/categorias-incidencias', order_index: 3, is_active: true },
		{ id: 15, category_id: 3, label: 'Limpieza de Tokens Vencidos', href: '/limpieza-tokens', order_index: 5, is_active: true },
		{ id: 16, category_id: 4, label: 'Cambiar PIN', href: '/change-pin', order_index: 1, is_active: true },
		{ id: 17, category_id: 4, label: 'Salir del Sistema', href: null, order_index: 2, is_active: true },
		{ id: 14, category_id: 3, label: 'Limpieza de Tablas de Inventario y Movimientos', href: '/limpieza-tablas', order_index: 4, is_active: true },
		{ id: 18, category_id: 3, label: 'Categorias del Menu Principal', href: '/menu-categories', order_index: 6, is_active: true },
		{ id: 19, category_id: 3, label: 'Opciones del Menu Principal', href: '/menu-items', order_index: 7, is_active: true },
		{ id: 20, category_id: 3, label: 'Roles y Opciones del Menu Principal', href: '/menu-item-roles', order_index: 8, is_active: true },
		{ id: 3, category_id: 1, label: 'Toma de Inventario por Producto', href: '/toma-inventario-por-producto', order_index: 3, is_active: true }
	];

	for (const i of items) {
		await pgm.db.query(
			`INSERT INTO menu_items (id, category_id, label, href, order_index, is_active)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 ON CONFLICT (id) DO UPDATE SET
			   category_id = EXCLUDED.category_id,
			   label = EXCLUDED.label,
			   href = EXCLUDED.href,
			   order_index = EXCLUDED.order_index,
			   is_active = EXCLUDED.is_active`,
			[i.id, i.category_id, i.label, i.href, i.order_index, i.is_active]
		);
	}
	await pgm.db.query(`SELECT setval('menu_items_id_seq', (SELECT COALESCE(MAX(id),1) FROM menu_items))`);

	// Seed menu_item_roles filtering to existing roles (1-3)
	const links = [
		{ menu_item_id: 1, role_id: 1 },
		{ menu_item_id: 2, role_id: 1 },
		{ menu_item_id: 3, role_id: 1 },
		{ menu_item_id: 4, role_id: 1 },
		{ menu_item_id: 5, role_id: 1 },
		{ menu_item_id: 6, role_id: 1 },
		{ menu_item_id: 7, role_id: 1 },
		{ menu_item_id: 8, role_id: 1 },
		{ menu_item_id: 9, role_id: 1 },
		{ menu_item_id: 10, role_id: 1 },
		{ menu_item_id: 11, role_id: 1 },
		{ menu_item_id: 12, role_id: 1 },
		{ menu_item_id: 13, role_id: 1 },
		{ menu_item_id: 14, role_id: 1 },
		{ menu_item_id: 15, role_id: 1 },
		{ menu_item_id: 16, role_id: 1 },
		{ menu_item_id: 17, role_id: 1 },

		{ menu_item_id: 1, role_id: 3 },
		{ menu_item_id: 2, role_id: 3 },
		{ menu_item_id: 3, role_id: 3 },
		{ menu_item_id: 4, role_id: 3 },
		{ menu_item_id: 5, role_id: 3 },
		{ menu_item_id: 6, role_id: 3 },
		{ menu_item_id: 7, role_id: 3 },
		{ menu_item_id: 8, role_id: 3 },
		{ menu_item_id: 9, role_id: 3 },
		{ menu_item_id: 10, role_id: 3 },
		{ menu_item_id: 13, role_id: 3 },
		{ menu_item_id: 16, role_id: 3 },
		{ menu_item_id: 17, role_id: 3 },

		{ menu_item_id: 1, role_id: 2 },
		{ menu_item_id: 2, role_id: 2 },
		{ menu_item_id: 3, role_id: 2 },
		{ menu_item_id: 5, role_id: 2 },
		{ menu_item_id: 6, role_id: 2 },
		{ menu_item_id: 16, role_id: 2 },
		{ menu_item_id: 17, role_id: 2 }
	];

	for (const l of links) {
		await pgm.db.query(
			`INSERT INTO menu_item_roles (menu_item_id, role_id)
			 VALUES ($1, $2)
			 ON CONFLICT (menu_item_id, role_id) DO NOTHING`,
			[l.menu_item_id, l.role_id]
		);
	}
};

export const down = async (pgm) => {
	// Remove links
	await pgm.db.query(`DELETE FROM menu_item_roles WHERE role_id IN (1,2,3)`);
	// Remove menu items and categories seeded here
	await pgm.db.query(`DELETE FROM menu_items WHERE id BETWEEN 1 AND 20`);
	await pgm.db.query(`DELETE FROM menu_categories WHERE id BETWEEN 1 AND 4`);
	// Remove roles (only if they match seeded names to avoid nuking other roles unintentionally)
	await pgm.db.query(`DELETE FROM roles WHERE id IN (1,2,3) AND nombre_rol IN ('Admin','Inventario','Supervisor')`);
};
