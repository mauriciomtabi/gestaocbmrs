const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const NEW_URL = 'https://lirbmymfsdktxdvbnrrg.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcmJteW1mc2RrdHhkdmJucnJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkyODUzNCwiZXhwIjoyMDk3NTA0NTM0fQ.ebsWZ12HXqnFCKhafN266cH4vVrfQFrLQW6Cyt79j-c';

const newDb = createClient(NEW_URL, NEW_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function applySchema() {
  console.log('📐 Aplicando schema no novo projeto...');
  
  const sql = fs.readFileSync('./scratch/schema-novo-projeto.sql', 'utf8');
  
  // Split por statements (separados por ;)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  let ok = 0, fail = 0;
  for (const stmt of statements) {
    try {
      const { error } = await newDb.rpc('exec_sql', { sql: stmt + ';' });
      if (error && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
        console.log(`  ⚠️  ${error.message.substring(0, 80)}`);
        fail++;
      } else {
        ok++;
      }
    } catch(e) {
      // ignore
    }
  }
  
  console.log(`   Statements: ${ok} ok, ${fail} falhas`);
}

async function migrateUsers() {
  // OLD project - try with service role
  const OLD_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
  const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MTY5NSwiZXhwIjoyMDg1NDM3Njk1fQ.Rme-4TmNPhCJzQTb0pLjSVmHtPUJV6kYcNNifHlWHaw';
  
  console.log('\n👥 Tentando exportar usuários do projeto antigo...');
  
  // Try direct fetch instead of supabase-js
  try {
    const res = await fetch(`${OLD_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: {
        'apikey': OLD_SERVICE_KEY,
        'Authorization': `Bearer ${OLD_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      const errText = await res.text();
      console.log(`   ❌ Falha (${res.status}): ${errText.substring(0, 100)}`);
      return [];
    }
    
    const data = await res.json();
    const users = data.users || [];
    console.log(`   ✅ ${users.length} usuários encontrados`);
    return users;
  } catch(e) {
    console.log(`   ❌ Erro de rede: ${e.message}`);
    return [];
  }
}

async function migrateTableData(tableName) {
  const OLD_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
  const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MTY5NSwiZXhwIjoyMDg1NDM3Njk1fQ.Rme-4TmNPhCJzQTb0pLjSVmHtPUJV6kYcNNifHlWHaw';
  
  try {
    const res = await fetch(`${OLD_URL}/rest/v1/${tableName}?select=*&limit=5000`, {
      headers: {
        'apikey': OLD_SERVICE_KEY,
        'Authorization': `Bearer ${OLD_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });
    
    if (!res.ok) {
      const errText = await res.text();
      console.log(`   ❌ ${tableName}: ${res.status} - ${errText.substring(0, 80)}`);
      return [];
    }
    
    const data = await res.json();
    return data;
  } catch(e) {
    console.log(`   ❌ ${tableName}: ${e.message}`);
    return [];
  }
}

async function main() {
  console.log('🚀 MIGRAÇÃO PARA NOVO PROJETO SUPABASE\n');
  
  // 1. Testar novo projeto
  console.log('🔍 Testando novo projeto...');
  const { error: testErr } = await newDb.from('providers').select('count').limit(1);
  if (testErr && testErr.code !== '42P01' && !testErr.message.includes('does not exist')) {
    console.log(`   ❌ Erro: ${testErr.message}`);
  } else {
    console.log('   ✅ Novo projeto acessível\n');
  }
  
  // 2. Tentar exportar dados do projeto antigo via fetch direto
  console.log('📤 Exportando dados do projeto antigo via REST API...');
  const tables = ['providers', 'audit_logs', 'attendance', 'vehicles', 'fuel_supplies', 'fuel_audit_logs', 'face_descriptors', 'monthly_evaluations', 'service_swaps', 'sys_config', 'station_nicknames', 'profiles'];
  
  const exportedData = {};
  for (const table of tables) {
    process.stdout.write(`   ${table}... `);
    const rows = await migrateTableData(table);
    exportedData[table] = rows;
    console.log(`${rows.length} registros`);
  }
  
  // 3. Migrar usuários
  const users = await migrateUsers();
  
  // Salvar backup
  fs.writeFileSync('./scratch/migration-backup.json', JSON.stringify({ tables: exportedData, users }, null, 2));
  console.log('\n💾 Backup salvo em scratch/migration-backup.json');
  
  // Resumo
  const totalRows = Object.values(exportedData).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
  console.log(`\n📊 TOTAL: ${totalRows} registros exportados, ${users.length} usuários`);
  
  if (totalRows === 0 && users.length === 0) {
    console.log('\n⚠️  Nenhum dado exportado - projeto antigo completamente bloqueado.');
    console.log('   ➡️  Você precisará fazer a exportação manual pelo Supabase Dashboard.');
    console.log('   ➡️  Acesse o projeto antigo > Table Editor > selecione cada tabela > Download CSV');
  } else {
    console.log('\n✅ Exportação OK! Execute migrate-import.cjs para importar os dados.');
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
