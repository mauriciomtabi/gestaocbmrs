const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MTY5NSwiZXhwIjoyMDg1NDM3Njk1fQ.Ym3Bs77-_9WzLZHmmJKKHTfMFJYagVPB2T6GBOdgH2U';

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  const { data: swaps, error } = await serviceClient
    .from('service_swaps')
    .select('*')
    .eq('status', 'aguardando_escalado');

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${swaps.length} swaps in 'aguardando_escalado' status.`);
  for (const s of swaps) {
    console.log(`Updating swap ${s.id} to 'aguardando_substituto'...`);
    await serviceClient
      .from('service_swaps')
      .update({ status: 'aguardando_substituto' })
      .eq('id', s.id);
  }
  console.log("Cleanup complete!");
}

run();
