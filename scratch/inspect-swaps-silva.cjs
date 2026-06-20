const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MTY5NSwiZXhwIjoyMDg1NDM3Njk1fQ.Ym3Bs77-_9WzLZHmmJKKHTfMFJYagVPB2T6GBOdgH2U';

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const SILVA_ID = '14fb3202-cddb-4da6-ad9d-ba3201dd71ee';

async function run() {
  const { data: swaps, error } = await serviceClient
    .from('service_swaps')
    .select('*')
    .or(`escalado_id.eq.${SILVA_ID},substituto_id.eq.${SILVA_ID}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${swaps.length} swaps involving Silva:`);
  for (const s of swaps) {
    console.log(`ID: ${s.id}
    Created At: ${s.created_at}
    Escalado ID: ${s.escalado_id}
    Substituto ID: ${s.substituto_id}
    Data: ${s.data}
    Status: ${s.status}
    Observacao: ${s.observacao}
    Data Pagamento: ${s.data_pagamento}
    Horario Inicio: ${s.horario_inicio} / Fim: ${s.horario_fim}
    `);
  }
}

run();
