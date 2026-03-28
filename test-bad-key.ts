import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const BAD_KEY = 'sb_publishable_EQ77FYiIig_H3_HQXnwU9w_aE2dtnvW';

async function test() {
  console.log("Testing with BAD_KEY...");
  const start = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, BAD_KEY, { auth: { persistSession: false } });
    const { data, error } = await supabase.auth.signInWithPassword({ email: 'mtabi.adm@gmail.com', password: '@Speni190868' });
    console.log("Result:", { error: error?.message }, "Time:", Date.now() - start, "ms");
  } catch (e) {
    console.log("Exception:", e, "Time:", Date.now() - start, "ms");
  }
}

test();
