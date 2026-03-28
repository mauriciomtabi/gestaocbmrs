import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjE2OTUsImV4cCI6MjA4NTQzNzY5NX0.dTdM1Jyhu0G0skkuBH2flsgnKXbmFtLYTh3wj0TDRiQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log("Testing Supabase connection...");
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log("Session:", data, error);
  } catch (e) {
    console.error("Session Error:", e);
  }

  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    console.log("Profiles:", data, error);
  } catch (e) {
    console.error("Profiles Error:", e);
  }
}

test();
