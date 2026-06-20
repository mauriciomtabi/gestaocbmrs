const { createClient } = require('@supabase/supabase-js');

// === PROJETO ANTIGO (com egress estourado) ===
const OLD_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MTY5NSwiZXhwIjoyMDg1NDM3Njk1fQ.Rme-4TmNPhCJzQTb0pLjSVmHtPUJV6kYcNNifHlWHaw';

// === PROJETO NOVO ===
const NEW_URL = 'https://lirbmymfsdktxdvbnrrg.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcmJteW1mc2RrdHhkdmJucnJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkyODUzNCwiZXhwIjoyMDk3NTA0NTM0fQ.ebsWZ12HXqnFCKhafN266cH4vVrfQFrLQW6Cyt79j-c';

const oldDb = createClient(OLD_URL, OLD_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const newDb = createClient(NEW_URL, NEW_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// Tabelas na ordem correta (respeitando dependências de FK)
const TABLES = [
  'providers',
  'attendance',
  'fuel_supplies',
  'vehicles',
  'face_descriptors',
  'monthly_evaluations',
  'service_swaps',
  'audit_logs',
  'sys_config',
  'user_roles',
  'geo_perimeters',
];

async function exportTable(tableName) {
  console.log(`  📤 Exportando ${tableName}...`);
  let allRows = [];
  let from = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data, error } = await oldDb
      .from(tableName)
      .select('*')
      .range(from, from + batchSize - 1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log(`     ⚠️  Tabela ${tableName} não existe no projeto antigo, pulando.`);
        return [];
      }
      throw new Error(`Erro ao exportar ${tableName}: ${error.message}`);
    }
    
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < batchSize) break;
    from += batchSize;
  }
  
  console.log(`     ✅ ${allRows.length} registros exportados`);
  return allRows;
}

async function importTable(tableName, rows) {
  if (rows.length === 0) {
    console.log(`  ⏭️  ${tableName}: sem dados para importar`);
    return;
  }
  
  console.log(`  📥 Importando ${tableName} (${rows.length} registros)...`);
  const batchSize = 500;
  let imported = 0;
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await newDb
      .from(tableName)
      .upsert(batch, { onConflict: 'id' });
    
    if (error) {
      // Tenta sem onConflict se não houver coluna id
      const { error: error2 } = await newDb.from(tableName).insert(batch);
      if (error2) throw new Error(`Erro ao importar ${tableName}: ${error2.message}`);
    }
    imported += batch.length;
  }
  
  console.log(`     ✅ ${imported} registros importados`);
}

async function migrateUsers() {
  console.log('\n👥 Migrando usuários de autenticação...');
  
  // Listar usuários do projeto antigo
  const { data: { users }, error } = await oldDb.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`Erro ao listar usuários: ${error.message}`);
  
  console.log(`   ${users.length} usuários encontrados`);
  
  let migrated = 0;
  let skipped = 0;
  
  for (const user of users) {
    // Criar usuário no novo projeto com mesmos metadados
    const { error: createError } = await newDb.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: user.user_metadata || {},
      app_metadata: user.app_metadata || {},
      // Senha temporária - usuários precisarão resetar
      password: 'TrocaSenha@CBM2026',
    });
    
    if (createError) {
      if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
        skipped++;
      } else {
        console.log(`     ⚠️  Erro ao criar ${user.email}: ${createError.message}`);
      }
    } else {
      console.log(`     ✅ ${user.email}`);
      migrated++;
    }
  }
  
  console.log(`   Migrados: ${migrated}, Já existiam: ${skipped}`);
  return users;
}

async function main() {
  console.log('🚀 Iniciando migração do Supabase...');
  console.log(`   Origem: ${OLD_URL}`);
  console.log(`   Destino: ${NEW_URL}\n`);
  
  // Testar conexão com projeto antigo
  console.log('🔍 Testando conexão com projeto antigo...');
  const { data: testOld, error: testOldErr } = await oldDb.from('providers').select('count').limit(1);
  if (testOldErr && !testOldErr.message.includes('does not exist')) {
    console.log(`   ⚠️  Projeto antigo com restrições: ${testOldErr.message}`);
    console.log('   Tentando prosseguir mesmo assim...\n');
  } else {
    console.log('   ✅ Projeto antigo acessível\n');
  }
  
  // Testar conexão com projeto novo
  console.log('🔍 Testando conexão com projeto novo...');
  const { error: testNewErr } = await newDb.from('providers').select('count').limit(1);
  if (testNewErr && testNewErr.code !== '42P01') {
    console.error(`   ❌ Projeto novo inacessível: ${testNewErr.message}`);
    process.exit(1);
  }
  console.log('   ✅ Projeto novo acessível\n');
  
  // 1. Migrar dados das tabelas
  console.log('📊 Exportando dados do projeto antigo...');
  const exportedData = {};
  for (const table of TABLES) {
    try {
      exportedData[table] = await exportTable(table);
    } catch (e) {
      console.log(`   ⚠️  ${e.message}`);
      exportedData[table] = [];
    }
  }
  
  // 2. Migrar usuários de autenticação
  let users = [];
  try {
    users = await migrateUsers();
  } catch (e) {
    console.log(`   ⚠️  Migração de usuários falhou: ${e.message}`);
  }
  
  // Salvar dados exportados como backup JSON
  const fs = require('fs');
  const backup = { tables: exportedData, users: users.map(u => ({ id: u.id, email: u.email, metadata: u.user_metadata })) };
  fs.writeFileSync('./scratch/migration-backup.json', JSON.stringify(backup, null, 2));
  console.log('\n💾 Backup salvo em scratch/migration-backup.json');
  
  console.log('\n📊 RESUMO DA EXPORTAÇÃO:');
  for (const [table, rows] of Object.entries(exportedData)) {
    if (rows.length > 0) console.log(`   ${table}: ${rows.length} registros`);
  }
  
  console.log('\n✅ Exportação concluída! Execute migrate-import.cjs para importar no novo projeto.');
}

main().catch(e => {
  console.error('\n❌ Erro fatal:', e.message);
  process.exit(1);
});
