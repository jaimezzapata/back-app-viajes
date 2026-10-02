require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
  console.log('Testing connection to PostgreSQL database at:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log(' Successfully connected to PostgreSQL database!');
    const res = await client.query('SELECT NOW() as current_time, version() as version;');
    console.log('Query result:');
    console.log('Current time in DB:', res.rows[0].current_time);
    console.log('PostgreSQL version:', res.rows[0].version);
    
    // Check existing tables if any
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Existing tables in public schema:', tables.rows.map(r => r.table_name));

    await client.end();
    console.log('Connection closed cleanly.');
  } catch (err) {
    console.error(' Database connection error:', err);
    process.exit(1);
  }
}

testConnection();
