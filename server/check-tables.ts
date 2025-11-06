import { pool } from './db';

async function checkTables() {
  try {
    console.log('🔍 Checking database tables and structure...\n');

    // Check if request_places table exists
    const { rows: tables } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE '%request%'
      ORDER BY table_name
    `);

    console.log('📋 Request-related tables:');
    tables.forEach(t => console.log(`   - ${t.table_name}`));

    // Check request_places table structure
    console.log('\n📊 Structure of request_places table:');
    const { rows: columns } = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'request_places'
      ORDER BY ordinal_position
    `);

    if (columns.length === 0) {
      console.log('❌ request_places table does NOT exist!');
      console.log('\n🔧 You need to create the request_places table.');
    } else {
      columns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });

      // Check for any constraints
      console.log('\n🔗 Constraints on request_places:');
      const { rows: constraints } = await pool.query(`
        SELECT
          con.conname as constraint_name,
          con.contype as constraint_type,
          col.attname as column_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute col ON col.attrelid = rel.oid AND col.attnum = ANY(con.conkey)
        WHERE rel.relname = 'request_places'
      `);

      if (constraints.length === 0) {
        console.log('   No constraints found');
      } else {
        constraints.forEach(c => {
          const type = c.constraint_type === 'p' ? 'PRIMARY KEY' :
                      c.constraint_type === 'f' ? 'FOREIGN KEY' :
                      c.constraint_type === 'u' ? 'UNIQUE' :
                      c.constraint_type === 'c' ? 'CHECK' : 'OTHER';
          console.log(`   - ${c.constraint_name} (${type}) on ${c.column_name}`);
        });
      }

      // Check count
      const { rows: count } = await pool.query(`
        SELECT COUNT(*) as total FROM request_places
      `);
      console.log(`\n📈 Total rows in request_places: ${count[0].total}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkTables();
