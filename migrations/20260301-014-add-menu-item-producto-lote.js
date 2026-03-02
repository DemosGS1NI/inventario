export const up = async (pgm) => {
	// Add new menu item under Inventario (category_id 1)
	await pgm.db.query(
		`INSERT INTO menu_items (id, category_id, label, href, order_index, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (id) DO UPDATE SET
		   category_id = EXCLUDED.category_id,
		   label = EXCLUDED.label,
		   href = EXCLUDED.href,
		   order_index = EXCLUDED.order_index,
		   is_active = EXCLUDED.is_active` ,
		[21, 1, 'Toma de Inventario por Producto y Lote', '/toma-inventario-por-producto-lote-con-tara', 8, true]
	);

	// Ensure the menu_items sequence is at least the max id
	await pgm.db.query(`SELECT setval('menu_items_id_seq', (SELECT GREATEST(COALESCE(MAX(id),1), 21) FROM menu_items))`);

	// Link to roles Admin (1), Inventario (2), Supervisor (3)
	const links = [
		{ menu_item_id: 21, role_id: 1 },
		{ menu_item_id: 21, role_id: 2 },
		{ menu_item_id: 21, role_id: 3 }
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
	// Remove role links
	await pgm.db.query(`DELETE FROM menu_item_roles WHERE menu_item_id = 21 AND role_id IN (1,2,3)`);
	// Remove the menu item
	await pgm.db.query(`DELETE FROM menu_items WHERE id = 21`);
};
