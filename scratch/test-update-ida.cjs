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

// Let's find the Ida leg for the swap.
// The Volta leg is 575c783c-5f30-4491-b100-43b7b4617574.
// The Ida leg is f582dbde-b3ea-4feb-9383-bed4a79c3495.
const IDA_ID = 'f582dbde-b3ea-4feb-9383-bed4a79c3495';

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
  console.log("Logged in successfully! User ID:", authData.user.id);

  // Let's see current status of Ida in DB
  const { data: curIda } = await serviceClient.from('service_swaps').select('status').eq('id', IDA_ID).single();
  console.log("Current Ida status in DB:", curIda.status);

  // Set Ida status to 'pendente' using service role (which is its current status since it's approved/pendente)
  await serviceClient.from('service_swaps').update({ status: 'pendente' }).eq('id', IDA_ID);

  // Try to update Ida as Silva when it's 'pendente'
  console.log("\nTrying to update Ida to 'pendente' (or update observation) as Silva when status is 'pendente'...");
  const { data: updateData, error: updateError } = await userClient
    .from('service_swaps')
    .update({ status: 'pendente', observacao: '[TEST_IDA_UPDATE]' })
    .eq('id', IDA_ID)
    .select();

  if (updateError) {
    console.log("Update failed:", updateError.message);
  } else {
    console.log("Update succeeded! Row:", updateData);
  }
}

run();
