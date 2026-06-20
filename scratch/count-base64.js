import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MTY5NSwiZXhwIjoyMDg1NDM3Njk1fQ.Ym3Bs77-_9WzLZHmmJKKHTfMFJYagVPB2T6GBOdgH2U';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function main() {
  console.log("Checking base64 columns in tables...");
  
  // 1. Providers
  const { data: providers, error: err1 } = await supabase.from('providers').select('id, name, identity_doc, referral_doc, profile_photo, return_attachment');
  if (err1) {
    console.error("Error fetching providers:", err1.message);
  } else {
    let identityCount = 0;
    let referralCount = 0;
    let photoCount = 0;
    let returnAttachCount = 0;
    
    providers.forEach(p => {
      if (p.identity_doc && p.identity_doc.startsWith('data:')) identityCount++;
      if (p.referral_doc && p.referral_doc.startsWith('data:')) referralCount++;
      if (p.profile_photo && p.profile_photo.startsWith('data:')) photoCount++;
      if (p.return_attachment && p.return_attachment.startsWith('data:')) returnAttachCount++;
    });
    console.log(`Providers: Total=${providers.length}. Base64 stats: identity_doc=${identityCount}, referral_doc=${referralCount}, profile_photo=${photoCount}, return_attachment=${returnAttachCount}`);
  }

  // 2. Attendance
  const { data: attendance, error: err2 } = await supabase.from('attendance').select('id, provider_id, date, attachment_data');
  if (err2) {
    console.error("Error fetching attendance:", err2.message);
  } else {
    let base64Count = 0;
    attendance.forEach(a => {
      if (a.attachment_data && a.attachment_data.startsWith('data:')) base64Count++;
    });
    console.log(`Attendance: Total=${attendance.length}. Base64 stats: attachment_data=${base64Count}`);
  }

  // 3. Vehicles
  const { data: vehicles, error: err3 } = await supabase.from('vehicles').select('id, plate, photo');
  if (err3) {
    console.error("Error fetching vehicles:", err3.message);
  } else {
    let base64Count = 0;
    vehicles.forEach(v => {
      if (v.photo && v.photo.startsWith('data:')) base64Count++;
    });
    console.log(`Vehicles: Total=${vehicles.length}. Base64 stats: photo=${base64Count}`);
  }

  // 4. Fuel Supplies
  const { data: fuel, error: err4 } = await supabase.from('fuel_supplies').select('id, date, attachment_data, ticket_log_data');
  if (err4) {
    console.error("Error fetching fuel_supplies:", err4.message);
  } else {
    let attachCount = 0;
    let ticketLogCount = 0;
    fuel.forEach(f => {
      if (f.attachment_data && f.attachment_data.startsWith('data:')) attachCount++;
      if (f.ticket_log_data && f.ticket_log_data.startsWith('data:')) ticketLogCount++;
    });
    console.log(`Fuel Supplies: Total=${fuel.length}. Base64 stats: attachment_data=${attachCount}, ticket_log_data=${ticketLogCount}`);
  }
}

main();
