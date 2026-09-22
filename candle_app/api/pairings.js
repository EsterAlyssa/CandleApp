import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    
    try {
        const { family_id } = req.query;
        let result;

        if (family_id) {
            // Filtra per famiglia specifica
            result = await sql`
                SELECT * FROM family_pairings 
                WHERE source_family_id = ${family_id} OR target_family_id = ${family_id}
            `;
        } else {
            // Restituisce tutti gli abbinamenti
            result = await sql`SELECT * FROM family_pairings`;
        }

        res.status(200).json(result);
    } catch (error) {
        console.error('[API PAIRINGS ERROR]', error);
        res.status(500).json({ error: error.message });
    }
}