import { sql } from '@vercel/postgres';
import XLSX from 'xlsx';
import { format } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

export async function GET() {
  try {
    // Get the base table column types from PostgreSQL
    const tableInfo = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'inventario'
    `;
    
    // Create a mapping of column names to their types
    const columnTypes = {};
    tableInfo.rows.forEach(col => {
      columnTypes[col.column_name] = col.data_type;
    });

    // Add manual types for calculated columns
    columnTypes['actualizado'] = 'text';
    columnTypes['validado'] = 'text';

    // Fetch all records from the table
    const result = await sql`
       select i.bodega, i.ubicacion, i.marca, i.id, i.codigo_barras, i.numero_parte, i.descripcion,
              i.inventario_sistema, i.inventario_fisico,
              timezone('America/Chicago', i.fecha_inventario) as fecha_inventario, 
              i.categoria_incidencia, i.incidencia, i.single_item_ean13, master_carton_ean13,
              u1.nombre || ' ' || u1.apellido AS actualizado,
              u2.nombre || ' ' || u2.apellido AS validado
        from inventario i 
        left join usuarios u1 on i.actualizado_por = u1.id
        left join usuarios u2 on i.validado_por = u2.id
        order by i.bodega, i.ubicacion, i.marca, i.id
    `;

    if (!result.rows || result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No data found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prepare data with explicit type conversion
    const headers = Object.keys(result.rows[0]);
    const data = result.rows.map(row => {
      return headers.map(header => {
        const value = row[header];
        const dataType = columnTypes[header];
        
        // Handle numeric types
        if (dataType === 'numeric') {
          return Number(value);
        }
        // Handle timestamp
        else if (dataType === 'timestamp with time zone') {
          return value ? new Date(value) : null;
        }
        return value;
      });
    });

    // Create worksheet with headers and data
    const worksheetData = [headers, ...data];
    
    // Create a workbook and add a worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData, { 
      cellDates: true 
    });

    // Set column formats
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; C++) {
      const header = headers[C];
      const dataType = columnTypes[header];
      
      // Skip the header row
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellRef]) continue;

        if (dataType === 'numeric') {
          // Force numeric type and format
          worksheet[cellRef] = {
            t: 'n',
            v: Number(worksheet[cellRef].v),
            z: '###0'  // Format with 2 decimal places
          };
        } 
        else if (dataType === 'timestamp with time zone') {
          // Handle null timestamps
          if (worksheet[cellRef].v === null) {
            worksheet[cellRef] = { t: 's', v: '' }; // Empty string for null dates
          } else {
            worksheet[cellRef] = {
              t: 'd',
              v: new Date(worksheet[cellRef].v),
              z: 'yyyy-mm-dd hh:mm:ss'
            };
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');

    // Generate file name with timestamp
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const fileName = `comersa_output_${timestamp}.xlsx`;

    // Write workbook to a buffer with explicit options
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      cellDates: true,
      numbers: Number
    });

    // Prepare file for download
    console.log(`Generated Excel file: ${fileName}`);
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${fileName}`,
      },
    });
  } catch (error) {
    console.error('Error generating Excel file:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}