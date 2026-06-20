import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjE2OTUsImV4cCI6MjA4NTQzNzY5NX0.dTdM1Jyhu0G0skkuBH2flsgnKXbmFtLYTh3wj0TDRiQ';

async function createCobomUser() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  
  const email = 'cobom.consulta@cbm.rs.gov.br';
  const password = 'CobomConsulta@193'; // Secure default password
  
  console.log(`Registrando usuário ${email}...`);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: 'COBOM CONSULTA',
        war_name: 'COBOM',
        rank: 'Cb',
        cpf: '000.000.000-00'
      }
    }
  });

  if (error) {
    console.error('Erro no sign up:', error.message);
    return;
  }

  const userId = data.user?.id;
  if (!userId) {
    console.error('Nenhum ID de usuário retornado.');
    return;
  }

  console.log(`Usuário criado com ID: ${userId}.`);
  console.log('Tentando configurar as telas permitidas na tabela profiles...');

  // Espera 2 segundos para o trigger terminar de criar o perfil
  await new Promise(resolve => setTimeout(resolve, 2000));

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      allowed_screens: ['dashboard', 'providers', 'fuel', 'swaps'],
      is_admin: false,
      name: 'COBOM CONSULTA',
      war_name: 'COBOM',
      rank: 'Cb'
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Erro ao atualizar perfil:', updateError.message);
  } else {
    console.log('Perfil atualizado com sucesso com acesso de consulta!');
  }
}

createCobomUser();
