const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MTY5NSwiZXhwIjoyMDg1NDM3Njk1fQ.Ym3Bs77-_9WzLZHmmJKKHTfMFJYagVPB2T6GBOdgH2U';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  const { data, error } = await supabase
    .from('service_swaps')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.log("Error fetching swaps:", error.message);
  } else {
    console.log("Swaps:");
    data.forEach(s => {
      console.log(`ID: ${s.id}\n  Escalado: ${s.escalado_id}\n  Substituto: ${s.substituto_id}\n  Data: ${s.data}\n  Status: ${s.status}\n  Obs: ${s.observacao}\n  Created: ${s.created_at}\n  Data Pag: ${s.data_pagamento}\n  Horario Pag: ${s.horario_inicio_pagamento}-${s.horario_fim_pagamento}\n`);
    });
  }
}

run();
