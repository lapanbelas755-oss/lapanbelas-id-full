import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ooxjjhzojligmlyuegat.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGpqaHpvamxpZ21seXVlZ2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODQwNDAsImV4cCI6MjA5NDY2MDA0MH0.XG9gL9qJ6fzdRjiZC8W52ezPf074kdZSWs91Z5116pY');

const run = async () => {
    // Just sync 2046-06-17 to have 1 slot booked (sisa 2)
    const { error } = await supabase.from('date_availability').upsert([{ date: '2046-06-17', slots_booked: 1, max_slots: 3, is_manually_closed: false }]);
    console.log("Fixed 2046-06-17:", error);
};
run();
