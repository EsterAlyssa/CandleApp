import { supabase } from './js/supabase.js'; async function check() { const {data} = await supabase.from('family_pairings').select('*'); console.log(data); } check();
