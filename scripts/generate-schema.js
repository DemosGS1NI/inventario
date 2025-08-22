// scripts/generate-schema-fixed.js
import { sql } from './database.js';
import fs from 'fs';

// Helper function to map PostgreSQL types to DBML types
function mapDataType(pgType, characterMaxLength) {
	switch (pgType) {
		case 'character varying':
			return characterMaxLength ? `varchar(${characterMaxLength})` : 'varchar';
		case 'character':
			return characterMaxLength ? `char(${characterMaxLength})` : 'char';
		case 'text':
			return 'text';
		case 'integer':
			return 'integer';
		case 'bigint':
			return 'bigint';
		case 'smallint':
			return 'smallint';
		case 'boolean':
			return 'boolean';
		case 'timestamp without time zone':
		case 'timestamp with time zone':
			return 'timestamp';
		case 'date':
			return 'date';
		case 'time without time zone':
		case 'time with time zone':
			return 'time';
		case 'json':
		case 'jsonb':
			return 'json';
		case 'uuid':
			return 'uuid';
		case 'numeric':
		case 'decimal':
			return 'decimal';
		case 'real':
		case 'double precision':
			return 'float';
		default:
			return pgType;
	}
}

// Helper function to clean up PostgreSQL default values for DBML
function formatDefaultValue(defaultValue, dataType) {
	if (!defaultValue) return null;

	// Remove PostgreSQL casting syntax
	let cleaned = defaultValue.replace(/::[\w\s\[\]]+/g, '');

	// Handle sequences (auto-increment)
	if (cleaned.includes('nextval(')) {
		return null; // Will be handled as 'increment' constraint
	}

	// Handle current timestamp
	if (cleaned.includes('CURRENT_TIMESTAMP') || cleaned.includes('now()')) {
		return '`CURRENT_TIMESTAMP`';
	}

	// Handle boolean values
	if (dataType === 'boolean') {
		if (cleaned === 'true' || cleaned === "'t'") return 'true';
		if (cleaned === 'false' || cleaned === "'f'") return 'false';
	}

	// Handle string literals
	if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
		return cleaned;
	}

	// Handle numeric values
	if (!isNaN(cleaned)) {
		return cleaned;
	}

	// Default case - wrap in quotes if it's not already
	return `'${cleaned}'`;
}

// Helper function to check if column is auto-increment
function isAutoIncrement(defaultValue) {
	return defaultValue && defaultValue.includes('nextval(');
}

async function generateSchema() {
	try {
		console.log('🔄 Fetching database schema information...');

		// Get comprehensive table information including constraints
		const tables = await sql`
      SELECT DISTINCT
        c.table_name,
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.is_nullable,
        c.column_default,
        c.ordinal_position,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku 
              ON tc.constraint_name = ku.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_schema = 'public'
              AND ku.table_name = c.table_name 
              AND ku.column_name = c.column_name
          ) THEN true 
          ELSE false 
        END as is_primary_key,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku 
              ON tc.constraint_name = ku.constraint_name
            WHERE tc.constraint_type = 'UNIQUE'
              AND tc.table_schema = 'public'
              AND ku.table_name = c.table_name 
              AND ku.column_name = c.column_name
          ) THEN true 
          ELSE false 
        END as is_unique
      FROM information_schema.columns c
      JOIN information_schema.tables t ON c.table_name = t.table_name
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `;

		// Get foreign key relationships
		console.log('🔄 Fetching foreign key relationships...');
		const foreignKeys = await sql`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `;

		console.log('📝 Generating DBML content...');

		// Generate DBML content
		let dbmlContent = `// Auto-generated schema from database
// Generated on: ${new Date().toISOString()}
// Source: PostgreSQL database

Project toma_inventario {
  database_type: 'PostgreSQL'
  Note: 'Inventory Management System - Auto-generated documentation'
}

`;

		// Group columns by table
		const tableMap = {};
		tables.rows.forEach((row) => {
			if (!tableMap[row.table_name]) {
				tableMap[row.table_name] = [];
			}
			tableMap[row.table_name].push(row);
		});

		// Generate table definitions
		Object.entries(tableMap).forEach(([tableName, columns]) => {
			dbmlContent += `Table ${tableName} {\n`;

			columns.forEach((col) => {
				// Map PostgreSQL type to DBML type
				const dbmlType = mapDataType(col.data_type, col.character_maximum_length);
				let line = `  ${col.column_name} ${dbmlType}`;

				// Collect constraints
				const constraints = [];

				// Primary key
				if (col.is_primary_key) {
					constraints.push('pk');

					// Check if it's auto-increment
					if (isAutoIncrement(col.column_default)) {
						constraints.push('increment');
					}
				}

				// Unique constraint
				if (col.is_unique && !col.is_primary_key) {
					constraints.push('unique');
				}

				// Not null constraint
				if (col.is_nullable === 'NO' && !col.is_primary_key) {
					constraints.push('not null');
				}

				// Default value (only if not auto-increment)
				if (col.column_default && !isAutoIncrement(col.column_default)) {
					const defaultVal = formatDefaultValue(col.column_default, col.data_type);
					if (defaultVal) {
						constraints.push(`default: ${defaultVal}`);
					}
				}

				// Foreign key reference
				const fk = foreignKeys.rows.find(
					(fk) => fk.table_name === tableName && fk.column_name === col.column_name
				);
				if (fk) {
					constraints.push(`ref: > ${fk.foreign_table_name}.${fk.foreign_column_name}`);
				}

				// Add constraints to line
				if (constraints.length > 0) {
					line += ` [${constraints.join(', ')}]`;
				}

				dbmlContent += line + '\n';
			});

			dbmlContent += '}\n\n';
		});

		// Note: Foreign key relationships are already defined inline in table definitions

		// Add documentation notes
		dbmlContent += `// Generated Schema Summary
Note schema_info {
  '''
  Database: PostgreSQL
  Generated: ${new Date().toISOString()}
  Tables: ${Object.keys(tableMap).length}
  Foreign Keys: ${foreignKeys.rows.length}
  
  This schema was automatically generated from the database structure.
  Manual modifications may be overwritten on regeneration.
  '''
}
`;

		// Write to file
		const filename = 'toma-inventario-schema.dbml';
		fs.writeFileSync(filename, dbmlContent);

		console.log('✅ Schema generated successfully!');
		console.log(`📝 File: ${filename}`);
		console.log(`📊 Tables processed: ${Object.keys(tableMap).length}`);
		console.log(`🔗 Foreign keys found: ${foreignKeys.rows.length}`);
	} catch (error) {
		console.error('❌ Error generating schema:', error);
		throw error;
	} finally {
		// Close database connection
		if (sql.end) {
			await sql.end();
		}
	}
}

// Run the generator
generateSchema()
	.then(() => {
		console.log('🎉 Schema generation completed successfully!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('❌ Fatal error:', error);
		process.exit(1);
	});
