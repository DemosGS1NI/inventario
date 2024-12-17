// src/lib/menu.js

export const menuOptions = [
    { label: 'Carga Datos desde Archivo Excel', href: '/carga-datos-excel', roles: ['Admin', 'Supervisor'] },
    { label: 'Toma de Inventario', href: '/toma-inventario', roles: ['Admin', 'Supervisor', 'Inventario'] },
    { label: 'Toma de Inventario 2', href: '/toma-inventario-quaggajs', roles: ['Admin', 'Supervisor', 'Inventario'] },
    { label: 'Descargar Datos a Archivo Excel', href: '/descarga-datos-excel', roles: ['Admin', 'Supervisor'] },
    { label: 'Reporte de Resultado de Carga Excel', href: '/reporte-carga-excel', roles: ['Admin', 'Supervisor'] },
    { label: 'Administracion de Toma de Inventario', href: '/admin-inventario', roles: ['Admin', 'Supervisor'] },
    { label: 'Categorias de Incidencias', href: '/categorias-incidencias', roles: ['Admin', 'Supervisor'] },
    { label: 'Usuarios', href: '/usuarios', roles: ['Admin'] },
    { label: 'Roles', href: '/roles', roles: ['Admin'] },
    { label: 'Cambiar PIN', href: '/change-pin', roles: ['Admin', 'Inventario', 'Supervisor'] }, 
    { label: 'Log out', action: 'logout', roles: ['Admin', 'Inventario', 'Supervisor'] }, 
  ];
  