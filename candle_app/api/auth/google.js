import { neon } from '@neondatabase/serverless';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

// Inizializziamo il motore SQL passandogli il link segreto di Vercel/Neon
const sql = neon(process.env.DATABASE_URL);
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default async function handler(req, res) {
    // Gestione CORS
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ error: 'Token Google mancante' });
    }

    try {
        // 1. Verifica crittografica del gettone direttamente con Google
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        
        // 2. Estrazione dati utente certificati da Google
        const payload = ticket.getPayload();
        const { email, name } = payload;

        // 3. Ricerca utente nel nostro database Vercel
        let users = await sql`SELECT * FROM users WHERE email = ${email}`;
        let user;

        if (users.length === 0) {
            // Se l'utente Google non esiste, lo creiamo in automatico.
            const newUser = await sql`
                INSERT INTO users (email, password_hash, name)
                VALUES (${email}, 'GOOGLE_OAUTH_USER', ${name})
                RETURNING id, email, name;
            `;
            user = newUser[0];
        } else {
            user = users[0];
        }

        // 4. Generazione del nostro Token JWT interno per la navigazione
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 5. Restituzione del pacchetto al frontend
        res.status(200).json({ user, token });

    } catch (error) {
        console.error('Errore validazione Google Auth:', error);
        res.status(401).json({ error: 'Autenticazione Google fallita' });
    }
}