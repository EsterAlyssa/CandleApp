import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    // ⚠️ Gestione pre-flight CORS
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e password sono obbligatorie' });
    }

    try {
        // 1. Estrazione utente dal DB
        const users = await sql`SELECT * FROM users WHERE email = ${email}`;
        
        // ⚠️ Prevenzione enumerazione utenti: messaggio generico
        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        const user = users[0];

        // 2. Comparazione sicura hash vs password in chiaro
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        // 3. Generazione Token di Sessione
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 4. Data sanitization (MAI inviare l'hash al client frontend!)
        delete user.password_hash;

        // 5. Successo
        res.status(200).json({ user, token });

    } catch (error) {
        console.error('Errore fatale in login:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
}