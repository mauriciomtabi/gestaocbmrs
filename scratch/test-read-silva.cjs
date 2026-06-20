const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjE2OTUsImV4cCI6MjA4NTQzNzY5NX0.dTdM1Jyhu0G0skkuBH2flsgnKXbmFtLYTh3wj0TDRiQ';

const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

const SWAP_ID = '575c783c-5f30-4491-b100-43b7b4617574';

async function run() {
  console.log("Logging in as Silva...");
  const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
    email: 'soldado.teste@cbm.rs.gov.br',
    password: 'PasswordSilva123!'
  });

  if (authError) {
    console.error("Auth error:", authError.message);
    return;
  }

  // Try to select the row
  const { data, error } = await userClient
    .from('service_swaps')
    .select('*')
    .eq('id', SWAP_ID);

  if (error) {
    console.error("Select error:", error.message);
  } else {
    console.log("Select succeeded! Row:", data);
  }
}

run();
