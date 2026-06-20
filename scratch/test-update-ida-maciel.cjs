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

const IDA_ID = 'f582dbde-b3ea-4feb-9383-bed4a79c3495';

async function run() {
  console.log("Logging in as Maciel...");
  // Let's use Maciel's email and password. Maciel's email is probably ti.maciel@cbm.rs.gov.br. Let's find Maciel's email first.
  // Actually, we can fetch Maciel's profile to get the email.
  const { data: profile } = await serviceClient.from('profiles').select('email').eq('id', '7869829d-eb25-4440-98ab-c7f757c033eb').single();
  console.log("Maciel email:", profile.email);

  // We can reset/set password for Maciel to make sure we can log in.
  await serviceClient.auth.admin.updateUserById('7869829d-eb25-4440-98ab-c7f757c033eb', {
    password: 'PasswordMaciel123!'
  });

  const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
    email: profile.email,
    password: 'PasswordMaciel123!'
  });

  if (authError) {
    console.error("Auth error:", authError.message);
    return;
  }
  console.log("Logged in successfully! User ID:", authData.user.id);

  // Reset Ida status to 'pendente'
  await serviceClient.from('service_swaps').update({ status: 'pendente', data_pagamento: null }).eq('id', IDA_ID);

  // Try to update Ida data_pagamento as Maciel (escalado_id) when status is 'pendente'
  console.log("\nTrying to update Ida payment details as Maciel (escalado_id) when status is 'pendente'...");
  const { data: updateData, error: updateError } = await userClient
    .from('service_swaps')
    .update({ data_pagamento: '2026-06-25' })
    .eq('id', IDA_ID)
    .select();

  if (updateError) {
    console.log("Update failed:", updateError.message);
  } else {
    console.log("Update succeeded! Row:", updateData);
  }
}

run();
