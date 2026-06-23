const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ooxjjhzojligmlyuegat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGpqaHpvamxpZ21seXVlZ2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODQwNDAsImV4cCI6MjA5NDY2MDA0MH0.XG9gL9qJ6fzdRjiZC8W52ezPf074kdZSWs91Z5116pY';
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data, error } = await supabase.from('appointments').select('*').limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    console.log('No data or error:', error);
  }
}
run();
