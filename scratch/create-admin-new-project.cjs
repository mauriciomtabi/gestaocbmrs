const { createClient } = require('@supabase/supabase-js');

const NEW_URL = 'https://lirbmymfsdktxdvbnrrg.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcmJteW1mc2RrdHhkdmJucnJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkyODUzNCwiZXhwIjoyMDk3NTA0NTM0fQ.ebsWZ12HXqnFCKhafN266cH4vVrfQFrLQW6Cyt79j-c';

const db = createClient(NEW_URL, NEW_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// Lista de usuários do projeto antigo (vistos no print do dashboard)
const USERS = [
  { email: 'mtabi.adm@gmail.com', name: 'Administrador', warName: 'MACIEL', rank: '3º SGT', isAdmin: true },
];

async function createAdminUser() {
  console.log('👤 Criando usuário admin no novo projeto...\n');
  
  for (const u of USERS) {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      password: 'Admin@CBM2026',
      email_confirm: true,
      user_metadata: { name: u.name, war_name: u.warName, rank: u.rank }
    });
    
    if (error) {
      if (error.message.includes('already') || error.message.includes('exists')) {
        console.log(`  ⚠️  ${u.email} já existe`);
      } else {
        console.log(`  ❌ Erro: ${error.message}`);
      }
      continue;
    }
    
    console.log(`  ✅ ${u.email} criado (ID: ${data.user.id})`);
    
    // Aguarda um momento para o trigger criar o profile
    await new Promise(r => setTimeout(r, 1000));
    
    // Atualizar profile como admin
    const { error: profileErr } = await db.from('profiles').upsert({
      id: data.user.id,
      email: u.email,
      name: u.name,
      war_name: u.warName,
      rank: u.rank,
      is_admin: u.isAdmin,
      allowed_screens: ['dashboard', 'providers', 'attendance', 'face-checkin', 'fuel', 'reports', 'settings', 'service-swap']
    }, { onConflict: 'id' });
    
    if (profileErr) {
      console.log(`  ⚠️  Profile: ${profileErr.message}`);
    } else {
      console.log(`  ✅ Profile admin configurado`);
    }
  }
  
  console.log('\n🔑 Senha temporária para todos: Admin@CBM2026');
  console.log('   (Altere após o primeiro login)');
}

createAdminUser().catch(e => console.error('❌', e.message));
