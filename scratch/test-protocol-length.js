import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjE2OTUsImV4cCI6MjA4NTQzNzY5NX0.dTdM1Jyhu0G0skkuBH2flsgnKXbmFtLYTh3wj0TDRiQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testLength() {
  const longProtocol = 'A'.repeat(1000);
  const testSupply = {
    id: '00000000-0000-0000-0000-000000000000', // temporary/test UUID
    date: new Date().toISOString(),
    location: 'Test Posto',
    cnpj: '00.000.000/0000-00',
    fuel_type: 'Test Fuel',
    liters: 10,
    price_per_liter: 5,
    total_value: 50,
    driver: 'Test Driver',
    plate: 'AAA0A00',
    km: 1000,
    attendant: 'Test Attendant',
    protocol: longProtocol
  };

  console.log("Attempting to insert test record with 1000-char protocol...");
  const { data, error } = await supabase.from('fuel_supplies').upsert([testSupply]).select();
  if (error) {
    console.error("Insert Error:", error.message);
  } else {
    console.log("Success! Inserted row ID:", data[0].id);
    // Cleanup
    await supabase.from('fuel_supplies').delete().eq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Cleanup done.");
  }
}

testLength();
