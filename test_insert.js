const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ooxjjhzojligmlyuegat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGpqaHpvamxpZ21seXVlZ2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODQwNDAsImV4cCI6MjA5NDY2MDA0MH0.XG9gL9qJ6fzdRjiZC8W52ezPf074kdZSWs91Z5116pY';
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data, error } = await supabase.from('date_availability').upsert([
    { date: '2026-06-04_makeup', slots_booked: 1, is_manually_closed: false, max_slots: 2 }
  ]);
  console.log('Error:', error);
}
run();
