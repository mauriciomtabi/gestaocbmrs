const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjE2OTUsImV4cCI6MjA4NTQzNzY5NX0.dTdM1Jyhu0G0skkuBH2flsgnKXbmFtLYTh3wj0TDRiQ';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MTY5NSwiZXhwIjoyMDg1NDM3Njk1fQ.Ym3Bs77-_9WzLZHmmJKKHTfMFJYagVPB2T6GBOdgH2U';

const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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

  // Set status of SWAP_ID (where Silva is escalado_id) to 'aguardando_substituto'
  await serviceClient.from('service_swaps').update({ status: 'aguardando_substituto', observacao: null }).eq('id', SWAP_ID);

  console.log("\nTrying to cancel SWAP_ID as Silva (escalado_id) when status is 'aguardando_substituto'...");
  const { data: updateData, error: updateError } = await userClient
    .from('service_swaps')
    .update({ status: 'cancelado', observacao: 'Cancelado por Silva' })
    .eq('id', SWAP_ID)
    .select();

  if (updateError) {
    console.log("Cancel failed:", updateError.message);
  } else {
    console.log("Cancel succeeded! Row:", updateData);
  }
}

run();
