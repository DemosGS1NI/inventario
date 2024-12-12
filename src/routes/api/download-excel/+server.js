import { sql } from '@vercel/postgres';
import XLSX from 'xlsx';
import { format } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

export async function GET() {
  try {
    // Fetch all records from the table
    const result = await sql`SELECT * FROM inventario ORDER BY id`;

    if (!result.rows || result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No data found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prepare data for Excel
    const rows = result.rows;
    const worksheetData = [Object.keys(rows[0]), ...rows.map((row) => Object.values(row))];

    // Create a workbook and add a worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');

    // Generate file name with timestamp
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const fileName = `comersa_output_${timestamp}.xlsx`;

    // Write workbook to a buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

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
