-- Add menu items for the third-party authorization feature
-- This script adds the "Third-Party Access" menu item to the "Cuenta" (Account) category

-- First, insert the new menu item into the "Cuenta" category
-- (assuming the "Cuenta" category already exists from the DBML schema)
INSERT INTO menu_items (category_id, label, href, order_index, is_active) 
SELECT 
    c.id, 
    'Aplicaciones de Terceros', 
    '/authorizations', 
    30,  -- Set order after other account items
    true
FROM menu_categories c 
WHERE c.name = 'Cuenta'
ON CONFLICT DO NOTHING;

-- Grant access to this menu item for all roles (modify as needed)
-- This gives all existing roles access to the third-party authorization page
INSERT INTO menu_item_roles (menu_item_id, role_id)
SELECT 
    mi.id as menu_item_id,
    r.id as role_id
FROM menu_items mi, roles r 
WHERE mi.label = 'Aplicaciones de Terceros' 
  AND mi.href = '/authorizations'
ON CONFLICT (menu_item_id, role_id) DO NOTHING;