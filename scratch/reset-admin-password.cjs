const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MTY5NSwiZXhwIjoyMDg1NDM3Njk1fQ.Rme-4TmNPhCJzQTb0pLjSVmHtPUJV6kYcNNifHlWHaw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function resetAdminPassword() {
  const EMAIL = 'mtabi.adm@gmail.com';
  const NEW_PASSWORD = 'Admin@CBM193';

  console.log(`Buscando usuário: ${EMAIL}...`);

  // List users to find the admin
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Erro ao listar usuários:', listError.message);
    return;
  }

  const user = users.users.find(u => u.email === EMAIL);
  if (!user) {
    console.error(`Usuário ${EMAIL} não encontrado!`);
    console.log('Usuários existentes:', users.users.map(u => u.email));
    return;
  }

  console.log(`Usuário encontrado: ${user.id}`);
  console.log(`Email confirmado: ${user.email_confirmed_at ? 'SIM' : 'NÃO'}`);
  console.log(`Último login: ${user.last_sign_in_at || 'nunca'}`);

  // Reset password
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password: NEW_PASSWORD,
    email_confirm: true
  });

  if (error) {
    console.error('Erro ao resetar senha:', error.message);
    return;
  }

  console.log('\n✅ Senha resetada com sucesso!');
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Nova senha: ${NEW_PASSWORD}`);
}

resetAdminPassword().catch(console.error);
