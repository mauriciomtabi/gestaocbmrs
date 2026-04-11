import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjE2OTUsImV4cCI6MjA4NTQzNzY5NX0.dTdM1Jyhu0G0skkuBH2flsgnKXbmFtLYTh3wj0TDRiQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagDates() {
  const { data: providers, error: pErr } = await supabase.from('providers').select('id, name');
  if (pErr) { console.error('Erro ao buscar providers:', pErr); return; }

  console.log('Total de providers:', providers.length);
  console.log('Todos os nomes:');
  providers.forEach(p => console.log(' -', JSON.stringify(p.name)));
}

diagDates().catch(console.error);
