import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  console.log("🟢 Inizio connessione a Supabase...")

  // Inizializzazione del client usando le variabili d'ambiente di Vercel
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  )

  console.log("✅ Query eseguita con successo:", data)

  try {
    // ⚠️ CRITICO: Eseguiamo una query microscopica. 
    const { data, error } = await supabase
      .from('blends')
      .select('id')
      .limit(1)

    if (error) throw error

    // Risposta HTTP 200 OK se il ping ha successo
    return res.status(200).json({ 
        status: 'Supabase svegliato con successo', 
        timestamp: new Date().toISOString() 
    })
    
  } catch (error) {
    return res.status(500).json({ error: 'Errore durante il ping', details: error.message })
  }
}