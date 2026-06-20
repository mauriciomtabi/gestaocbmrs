const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MTY5NSwiZXhwIjoyMDg1NDM3Njk1fQ.Ym3Bs77-_9WzLZHmmJKKHTfMFJYagVPB2T6GBOdgH2U';

async function confirmUser() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const email = 'cobom.consulta@cbm.rs.gov.br';

  console.log(`Buscando perfil para o email: ${email}...`);
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    console.error('Erro ao buscar perfil ou perfil não encontrado:', profileError?.message);
    
    // Se não encontrou no profiles, tenta buscar na lista de usuários auth
    console.log('Buscando diretamente nos usuários do Auth...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Erro ao listar usuários auth:', listError.message);
      return;
    }
    const authUser = users.find(u => u.email === email);
    if (!authUser) {
      console.error(`Usuário com email ${email} não encontrado no Auth.`);
      return;
    }
    await updateUser(supabase, authUser.id);
  } else {
    console.log(`Perfil encontrado. ID do usuário: ${profile.id}`);
    await updateUser(supabase, profile.id);
  }
}

async function updateUser(supabase, userId) {
  console.log(`Confirmando email e atualizando senha para o ID: ${userId}...`);
  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    { 
      email_confirm: true,
      password: 'Cobom@193'
    }
  );

  if (error) {
    console.error('Erro ao atualizar usuário:', error.message);
  } else {
    console.log('Usuário atualizado com sucesso! E-mail confirmado e senha alterada para Cobom@193.');
  }
}

confirmUser();
