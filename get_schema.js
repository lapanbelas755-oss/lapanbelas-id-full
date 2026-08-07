const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ooxjjhzojligmlyuegat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGpqaHpvamxpZ21seXVlZ2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODQwNDAsImV4cCI6MjA5NDY2MDA0MH0.XG9gL9qJ6fzdRjiZC8W52ezPf074kdZSWs91Z5116pY';
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, client_name, client_email, client_phone, client_address, additional_notes, package_name, event_date, resepsi_date, status, dp_amount, total_amount, created_at, jam_akad, jam_resepsi');
  console.log('Error:', error);
  console.log('Data length:', data ? data.length : 0);
}
run();
