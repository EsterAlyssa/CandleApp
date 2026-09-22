import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    
    try {
        const { ids } = req.query;
        let result;
        
        if (ids) {
            const idArray = ids.split(',');
            result = await sql`SELECT id, name_it FROM families WHERE id = ANY(${idArray}) ORDER BY name_it;`;
        } else {
            result = await sql`SELECT id, name_it FROM families ORDER BY name_it;`;
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}