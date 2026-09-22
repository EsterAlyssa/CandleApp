import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

    const { access_token } = req.body;

    if (!access_token) return res.status(400).json({ error: 'Token Google mancante' });

    try {
        // Chiediamo in modo sicuro a Google i dati dell'utente usando il Token
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        if (!userInfoRes.ok) throw new Error('Impossibile recuperare i dati da Google');

        const { email, name } = await userInfoRes.json();

        let users = await sql`SELECT * FROM users WHERE email = ${email}`;
        let user;

        if (users.length === 0) {
            const newUser = await sql`
                INSERT INTO users (email, password_hash, name)
                VALUES (${email}, 'GOOGLE_OAUTH_USER', ${name || ''})
                RETURNING id, email, name;
            `;
            user = newUser[0];
        } else {
            user = user = users[0];
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({ user, token });
    } catch (error) {
        console.error('Errore validazione Google Auth:', error);
        res.status(401).json({ error: 'Autenticazione Google fallita' });
    }
}