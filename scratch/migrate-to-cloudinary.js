import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MTY5NSwiZXhwIjoyMDg1NDM3Njk1fQ.Ym3Bs77-_9WzLZHmmJKKHTfMFJYagVPB2T6GBOdgH2U';

const CLOUD_NAME = 'dizhbrjdv';
const UPLOAD_PRESET = 'cbm_gestao';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Helper function to upload base64 to Cloudinary
async function uploadToCloudinary(base64Data, filename) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
  
  const formData = new URLSearchParams();
  formData.append('file', base64Data);
  formData.append('upload_preset', UPLOAD_PRESET);
  
  if (filename) {
    const safeFilename = filename.replace(/[^a-zA-Z0-9_\-]/g, '_');
    formData.append('public_id', safeFilename);
    formData.append('filename_override', safeFilename);
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  if (response.ok) {
    return data.secure_url;
  } else {
    throw new Error(data.error?.message || JSON.stringify(data));
  }
}

async function migrateProviders() {
  console.log("\n=== Starting Providers Migration ===");
  const { data: providers, error } = await supabase
    .from('providers')
    .select('id, name, identity_doc, referral_doc, profile_photo, return_attachment');

  if (error) {
    console.error("Error fetching providers:", error.message);
    return;
  }

  console.log(`Fetched ${providers.length} providers.`);
  let successCount = 0;
  let failCount = 0;

  for (const p of providers) {
    const updates = {};
    let needsUpdate = false;

    // 1. identity_doc
    if (p.identity_doc && p.identity_doc.startsWith('data:')) {
      console.log(`Uploading identity_doc for provider: ${p.name} (${p.id})...`);
      try {
        const url = await uploadToCloudinary(p.identity_doc, `provider_${p.id}_identity`);
        updates.identity_doc = url;
        needsUpdate = true;
        console.log(`-> Uploaded successfully: ${url}`);
      } catch (err) {
        console.error(`-> Failed to upload identity_doc:`, err.message);
        failCount++;
      }
    }

    // 2. referral_doc
    if (p.referral_doc && p.referral_doc.startsWith('data:')) {
      console.log(`Uploading referral_doc for provider: ${p.name} (${p.id})...`);
      try {
        const url = await uploadToCloudinary(p.referral_doc, `provider_${p.id}_referral`);
        updates.referral_doc = url;
        needsUpdate = true;
        console.log(`-> Uploaded successfully: ${url}`);
      } catch (err) {
        console.error(`-> Failed to upload referral_doc:`, err.message);
        failCount++;
      }
    }

    // 3. profile_photo
    if (p.profile_photo && p.profile_photo.startsWith('data:')) {
      console.log(`Uploading profile_photo for provider: ${p.name} (${p.id})...`);
      try {
        const url = await uploadToCloudinary(p.profile_photo, `provider_${p.id}_profile`);
        updates.profile_photo = url;
        needsUpdate = true;
        console.log(`-> Uploaded successfully: ${url}`);
      } catch (err) {
        console.error(`-> Failed to upload profile_photo:`, err.message);
        failCount++;
      }
    }

    // 4. return_attachment
    if (p.return_attachment && p.return_attachment.startsWith('data:')) {
      console.log(`Uploading return_attachment for provider: ${p.name} (${p.id})...`);
      try {
        const url = await uploadToCloudinary(p.return_attachment, `provider_${p.id}_return`);
        updates.return_attachment = url;
        needsUpdate = true;
        console.log(`-> Uploaded successfully: ${url}`);
      } catch (err) {
        console.error(`-> Failed to upload return_attachment:`, err.message);
        failCount++;
      }
    }

    if (needsUpdate) {
      console.log(`Updating provider ${p.name} (${p.id}) in database...`);
      const { error: updateErr } = await supabase
        .from('providers')
        .update(updates)
        .eq('id', p.id);

      if (updateErr) {
        console.error(`-> Failed to update database for provider ${p.id}:`, updateErr.message);
        failCount++;
      } else {
        console.log(`-> Database updated successfully!`);
        successCount++;
      }
    }
  }

  console.log(`Providers Migration finished. Successes: ${successCount}, Failures: ${failCount}`);
}

async function migrateAttendance() {
  console.log("\n=== Starting Attendance Migration ===");
  const { data: records, error } = await supabase
    .from('attendance')
    .select('id, provider_id, date, attachment_data');

  if (error) {
    console.error("Error fetching attendance records:", error.message);
    return;
  }

  console.log(`Fetched ${records.length} attendance records.`);
  let successCount = 0;
  let failCount = 0;

  for (const r of records) {
    if (r.attachment_data && r.attachment_data.startsWith('data:')) {
      console.log(`Uploading attachment_data for attendance record: ${r.id} (${r.date})...`);
      try {
        const url = await uploadToCloudinary(r.attachment_data, `attendance_${r.provider_id}_${r.date}_${r.id}`);
        
        const { error: updateErr } = await supabase
          .from('attendance')
          .update({ attachment_data: url })
          .eq('id', r.id);

        if (updateErr) {
          console.error(`-> Failed to update database for attendance ${r.id}:`, updateErr.message);
          failCount++;
        } else {
          console.log(`-> Uploaded and updated successfully: ${url}`);
          successCount++;
        }
      } catch (err) {
        console.error(`-> Failed to upload attachment_data:`, err.message);
        failCount++;
      }
    }
  }

  console.log(`Attendance Migration finished. Successes: ${successCount}, Failures: ${failCount}`);
}

async function migrateVehicles() {
  console.log("\n=== Starting Vehicles Migration ===");
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, plate, photo');

  if (error) {
    console.error("Error fetching vehicles:", error.message);
    return;
  }

  console.log(`Fetched ${vehicles.length} vehicles.`);
  let successCount = 0;
  let failCount = 0;

  for (const v of vehicles) {
    if (v.photo && v.photo.startsWith('data:')) {
      console.log(`Uploading photo for vehicle: ${v.plate} (${v.id})...`);
      try {
        const url = await uploadToCloudinary(v.photo, `vehicle_${v.plate}_${v.id}`);
        
        const { error: updateErr } = await supabase
          .from('vehicles')
          .update({ photo: url })
          .eq('id', v.id);

        if (updateErr) {
          console.error(`-> Failed to update database for vehicle ${v.id}:`, updateErr.message);
          failCount++;
        } else {
          console.log(`-> Uploaded and updated successfully: ${url}`);
          successCount++;
        }
      } catch (err) {
        console.error(`-> Failed to upload vehicle photo:`, err.message);
        failCount++;
      }
    }
  }

  console.log(`Vehicles Migration finished. Successes: ${successCount}, Failures: ${failCount}`);
}

async function migrateFuelSupplies() {
  console.log("\n=== Starting Fuel Supplies Migration ===");
  const { data: fuel, error } = await supabase
    .from('fuel_supplies')
    .select('id, date, attachment_data, ticket_log_data');

  if (error) {
    console.error("Error fetching fuel supplies:", error.message);
    return;
  }

  console.log(`Fetched ${fuel.length} fuel supplies.`);
  let successCount = 0;
  let failCount = 0;

  for (const f of fuel) {
    const updates = {};
    let needsUpdate = false;

    // 1. attachment_data
    if (f.attachment_data && f.attachment_data.startsWith('data:')) {
      console.log(`Uploading attachment_data for fuel supply: ${f.id} (${f.date})...`);
      try {
        const url = await uploadToCloudinary(f.attachment_data, `fuel_${f.date.split('T')[0]}_${f.id}`);
        updates.attachment_data = url;
        needsUpdate = true;
        console.log(`-> Uploaded successfully: ${url}`);
      } catch (err) {
        console.error(`-> Failed to upload attachment_data:`, err.message);
        failCount++;
      }
    }

    // 2. ticket_log_data
    if (f.ticket_log_data && f.ticket_log_data.startsWith('data:')) {
      console.log(`Uploading ticket_log_data for fuel supply: ${f.id} (${f.date})...`);
      try {
        const url = await uploadToCloudinary(f.ticket_log_data, `fuel_ticket_${f.date.split('T')[0]}_${f.id}`);
        updates.ticket_log_data = url;
        needsUpdate = true;
        console.log(`-> Uploaded successfully: ${url}`);
      } catch (err) {
        console.error(`-> Failed to upload ticket_log_data:`, err.message);
        failCount++;
      }
    }

    if (needsUpdate) {
      console.log(`Updating fuel supply ${f.id} in database...`);
      const { error: updateErr } = await supabase
        .from('fuel_supplies')
        .update(updates)
        .eq('id', f.id);

      if (updateErr) {
        console.error(`-> Failed to update database for fuel supply ${f.id}:`, updateErr.message);
        failCount++;
      } else {
        console.log(`-> Database updated successfully!`);
        successCount++;
      }
    }
  }

  console.log(`Fuel Supplies Migration finished. Successes: ${successCount}, Failures: ${failCount}`);
}

async function runAll() {
  console.log("Starting full database migration to Cloudinary...");
  await migrateProviders();
  await migrateAttendance();
  await migrateVehicles();
  await migrateFuelSupplies();
  console.log("\nFull database migration completed!");
}

runAll();
