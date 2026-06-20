const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MTY5NSwiZXhwIjoyMDg1NDM3Njk1fQ.Ym3Bs77-_9WzLZHmmJKKHTfMFJYagVPB2T6GBOdgH2U';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const SILVA_ID = '14fb3202-cddb-4da6-ad9d-ba3201dd71ee';

async function run() {
  console.log("Updating password for Silva...");
  const { data, error } = await supabase.auth.admin.updateUserById(
    SILVA_ID,
    { password: 'PasswordSilva123!' }
  );

  if (error) {
    console.error("Error updating password:", error.message);
  } else {
    console.log("Silva password updated successfully!");
  }
}

run();
