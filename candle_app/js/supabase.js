// ==========================================
// CONFIGURAZIONE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://xujtpimarnsairldgplk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1anRwaW1hcm5zYWlybGRncGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjcxMDksImV4cCI6MjA4Mzc0MzEwOX0.3SsZsJNJwIbxUVK_9C_L48XY9uMC8JxVNyx3CRUJ1TA';

// CORREZIONE: 
// 1. Usiamo "export const" per renderlo visibile agli altri file.
// 2. Chiamiamo la variabile "supabase" (senza trattino basso) per matchare main.js.
// 3. Usiamo window.supabase (perché arriva dalla CDN nel file HTML).

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);