const { createClient } = require('@supabase/supabase-js');

// Using anon key to test what the app actually does
const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjE2OTUsImV4cCI6MjA4NTQzNzY5NX0.dTdM1Jyhu0G0skkuBH2flsgnKXbmFtLYTh3wj0TDRiQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function inspectStorage() {
  console.log('=== Verificando Supabase Storage ===');
  
  // List all buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('Erro ao listar buckets:', bucketsError.message);
    console.log('(Pode ser restrição de egress - tentando mesmo assim)');
  } else {
    console.log('Buckets encontrados:', buckets?.map(b => b.name) || []);
  }

  // Check providers table for Supabase storage URLs
  console.log('\n=== Verificando URLs no banco de dados ===');
  const { data: providers, error: provErr } = await supabase
    .from('providers')
    .select('id, name, identity_doc, referral_doc, profile_photo')
    .limit(5);
  
  if (provErr) {
    console.error('Erro ao buscar providers:', provErr.message);
  } else {
    console.log(`\n--- Providers (${providers?.length} amostras) ---`);
    providers?.forEach(p => {
      const identityType = p.identity_doc?.startsWith('data:') ? 'BASE64' : 
                          p.identity_doc?.includes('supabase.co') ? 'SUPABASE_STORAGE' :
                          p.identity_doc?.includes('cloudinary') ? 'CLOUDINARY' :
                          p.identity_doc ? 'OUTRO' : 'VAZIO';
      const photoType = p.profile_photo?.includes('cloudinary') ? 'CLOUDINARY' :
                       p.profile_photo?.includes('supabase.co') ? 'SUPABASE_STORAGE' :
                       p.profile_photo?.startsWith('data:') ? 'BASE64' :
                       p.profile_photo ? 'OUTRO' : 'VAZIO';
      console.log(`  ${p.name}: identity=${identityType}, photo=${photoType}`);
    });
  }

  // Check attendance for Supabase storage URLs
  const { data: att, error: attErr } = await supabase
    .from('attendance')
    .select('id, attachment_url')
    .not('attachment_url', 'is', null)
    .limit(5);
  
  if (attErr) {
    console.error('Erro ao buscar attendance:', attErr.message);
  } else {
    console.log(`\n--- Attendance URLs (${att?.length} amostras) ---`);
    att?.forEach(a => {
      const type = a.attachment_url?.includes('cloudinary') ? 'CLOUDINARY' :
                  a.attachment_url?.includes('supabase.co') ? 'SUPABASE_STORAGE' :
                  a.attachment_url?.startsWith('data:') ? 'BASE64' : 'OUTRO';
      console.log(`  ${a.id}: ${type}`);
    });
  }

  // Check face_descriptors
  const { data: faces, error: faceErr } = await supabase
    .from('face_descriptors')
    .select('id, provider_id, photo_url')
    .limit(5);
  
  if (faceErr) {
    console.error('Erro ao buscar face_descriptors:', faceErr.message);
  } else {
    console.log(`\n--- Face Descriptors (${faces?.length} amostras) ---`);
    faces?.forEach(f => {
      const type = f.photo_url?.includes('cloudinary') ? 'CLOUDINARY' :
                  f.photo_url?.includes('supabase.co') ? 'SUPABASE_STORAGE' :
                  f.photo_url?.startsWith('data:') ? 'BASE64' : f.photo_url ? 'OUTRO' : 'VAZIO';
      console.log(`  provider_id=${f.provider_id}: photo=${type}`);
    });
  }
}

inspectStorage().catch(console.error);
