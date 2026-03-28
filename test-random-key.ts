import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const RANDOM_KEY = 'random_key_1234567890';

async function test() {
  console.log("Testing with RANDOM_KEY...");
  const start = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, RANDOM_KEY, { auth: { persistSession: false } });
    const { data, error } = await supabase.auth.signInWithPassword({ email: 'mtabi.adm@gmail.com', password: '@Speni190868' });
    console.log("Result:", { error: error?.message }, "Time:", Date.now() - start, "ms");
  } catch (e) {
    console.log("Exception:", e, "Time:", Date.now() - start, "ms");
  }
}

test();
