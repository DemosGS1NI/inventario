import { sql } from '@vercel/postgres';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

export async function GET() {
  try {
    const result = await sql`
      SELECT 
        u.id, 
        u.nombre, 
        u.apellido, 
        u.numero_telefono, 
        u.rol_id, 
        r.nombre_rol, 
        u.activo,
        u.debe_cambiar_pin
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      ORDER BY u.fecha_creacion DESC
    `;
    return new Response(JSON.stringify(result.rows), { status: 200 });
  } catch (error) {
    console.error('Error fetching usuarios:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


export async function POST({ request }) {
    const { nombre, apellido, numero_telefono, rol_id } = await request.json();
  
    try {
      // Hash the default PIN "0000"
      const defaultPinHash = await bcrypt.hash('0000', 12);
  
      // Insert new user with the default hashed PIN and `debe_cambiar_pin` set to true
      await sql`
        INSERT INTO usuarios (nombre, apellido, numero_telefono, rol_id, pin_hash, debe_cambiar_pin, activo, fecha_creacion)
        VALUES (${nombre}, ${apellido}, ${numero_telefono}, ${rol_id}, ${defaultPinHash}, true, true, NOW())
      `;
  
      return new Response('User created', { status: 201 });
    } catch (error) {
      console.error('Error creating user:', error);
      return new Response(
        JSON.stringify({ message: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

export async function PUT({ request }) {
  const { id, numero_telefono, nombre, apellido,  rol_id, activo, debe_cambiar_pin } = await request.json();
  await sql`
    UPDATE usuarios
    SET nombre = ${nombre}, apellido = ${apellido}, numero_telefono = ${numero_telefono}, 
    rol_id = ${rol_id},  activo = ${activo},  debe_cambiar_pin = ${debe_cambiar_pin}, fecha_actualizacion = NOW()
    WHERE id = ${id}
  `;

  console.log(nombre, apellido,numero_telefono, rol_id, activo, debe_cambiar_pin)
  return new Response('User updated', { status: 200 });

}

export async function DELETE({ params }) {
  const { id } = params;
  await sql`UPDATE usuarios SET activo = false WHERE id = ${id}`;
  return new Response('User deactivated', { status: 200 });
}
