import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    // ⚠️ Gestione pre-flight CORS per le richieste dal browser
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e password sono obbligatorie' });
    }

    try {
        // 1. Inizializzazione tabella strutturata (eseguita in modo sicuro ad ogni chiamata)
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;

        // 2. Prevenzione collisioni (Unique constraint check pre-inserimento)
        const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existingUser.length > 0) {
            return res.status(409).json({ error: 'Questa email è già registrata' });
        }

        // 3. Generazione del Salt e Hashing crittografico
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 4. Scrittura sicura con template tag (protezione SQL Injection automatica)
        const newUser = await sql`
            INSERT INTO users (email, password_hash, name)
            VALUES (${email}, ${password_hash}, ${name || ''})
            RETURNING id, email, name;
        `;

        const user = newUser[0];

        // 5. Firma del JSON Web Token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // ⚠️ La sessione scadrà dopo 7 giorni
        );

        // 6. Restituzione del pacchetto di autenticazione
        res.status(201).json({ user, token });

    } catch (error) {
        console.error('Errore fatale in register:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
}