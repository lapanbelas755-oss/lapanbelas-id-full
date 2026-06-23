const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ooxjjhzojligmlyuegat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGpqaHpvamxpZ21seXVlZ2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODQwNDAsImV4cCI6MjA5NDY2MDA0MH0.XG9gL9qJ6fzdRjiZC8W52ezPf074kdZSWs91Z5116pY';
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data, error } = await supabase.rpc('get_tables'); // Try rpc? No, we saw get_tables failed earlier.
  // Wait, let's just insert a dummy and fetch. If the table is empty, insert might fail if we don't provide non-nulls.
  // Better yet, just use the REST endpoint to get swagger schema.
  const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
  const json = await response.json();
  console.log(Object.keys(json.definitions.appointments.properties));
}
run();
