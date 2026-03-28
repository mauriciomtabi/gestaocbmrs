import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_KEY2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjE2OTUsImV4cCI6MjA4NTQzNzY5NX0.dTdM1Jyhu0G0skkuBH2flsgnKXbmFtLYTh3wj0TDRiQ';

async function test() {
  console.log("Testing login...");
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY2, { auth: { persistSession: false } });
    const { data, error } = await supabase.auth.signInWithPassword({ email: 'mtabi.adm@gmail.com', password: '@Speni190868' });
    console.log("Login Result:", { error: error?.message, user: data?.user?.id });
    
    if (data?.user) {
      console.log("Testing profile fetch...");
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      console.log("Profile Result:", { error: pError?.message, profile });
    }
  } catch (e) {
    console.log("Exception:", e);
  }
}

test();
