import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  console.log("🟢 Inizio connessione a Supabase...")

  // Il client ora ha accesso garantito al database
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  )

  try {
    const { data, error } = await supabase
      .from('blends')
      .select('id')
      .limit(1)

    // Intercettiamo immediatamente eventuali errori di query
    if (error) {
        console.error("🔴 Errore durante la query a Supabase:", error)
        throw error
    }

    // Qui la variabile 'data' è formalmente nel Lexical Scope corretto
    console.log("✅ Query eseguita con successo. Array ricevuto:", data)

    return res.status(200).json({ 
        status: 'Supabase svegliato con successo',
        timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("🔴 Crash interno della funzione:", error.message)
    return res.status(500).json({ error: 'Errore durante il ping', details: error.message })
  }
}