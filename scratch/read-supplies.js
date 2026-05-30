import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjE2OTUsImV4cCI6MjA4NTQzNzY5NX0.dTdM1Jyhu0G0skkuBH2flsgnKXbmFtLYTh3wj0TDRiQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function read() {
  const { data, error } = await supabase.from('fuel_supplies').select('*').limit(5);
  if (error) {
    console.error("Read Error:", error.message);
  } else {
    console.log("Count:", data.length);
    console.log("Records:", data);
  }
}

read();
