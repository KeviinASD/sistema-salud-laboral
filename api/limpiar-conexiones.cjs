/* 

COMANDO: cd "c:\Users\Kevin Rivas\Desktop\UNT\SOFTWARE\sistema-salud-laboral\api" ; node limpiar-conexiones.cjs
*/

const { Client } = require('pg');


const client = new Client({
  host: '217.216.64.28',
  port: 6969,
  user: 'viajesdb',
  password: 'viajesdb',
  database: 'viajesdb',
});

(async () => {
  try {
    console.log('🔌 Conectando a PostgreSQL...');
    await client.connect();
    
    // Ver cuántas conexiones hay
    const countResult = await client.query(`
      SELECT COUNT(*) as total 
      FROM pg_stat_activity 
      WHERE datname = 'viajesdb' 
      AND pid <> pg_backend_pid()
    `);
    console.log(`🔍 Conexiones activas encontradas: ${countResult.rows[0].total}`);
    
    // Cerrar todas las conexiones
    const terminateResult = await client.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = 'viajesdb' 
      AND pid <> pg_backend_pid()
    `);
    console.log(`✅ ${terminateResult.rowCount} conexiones cerradas exitosamente`);
    
    // Verificar
    const checkResult = await client.query(`
      SELECT COUNT(*) as total 
      FROM pg_stat_activity 
      WHERE datname = 'viajesdb' 
      AND pid <> pg_backend_pid()
    `);
    console.log(`📊 Conexiones restantes: ${checkResult.rows[0].total}`);
    console.log('\n✨ Limpieza completada. Ya puedes iniciar el backend con: npm run dev');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
