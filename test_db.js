const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ooxjjhzojligmlyuegat.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGpqaHpvamxpZ21seXVlZ2F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA4NDA0MCwiZXhwIjoyMDk0NjYwMDQwfQ.5Oz3Hu_R5DkzK_A-kGsxp0xIMmwMl1ZZ4AvCASb9eTc';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: assignments } = await supabase.from('editor_assignments').select('status_foto').limit(10);
  console.log("Assignments status_foto:", [...new Set(assignments.map(a => a.status_foto))]);
}
run();
