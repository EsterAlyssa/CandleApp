import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const { id, user_id, essence_id, ids } = req.query;
            let result;

            if (id) {
                result = await sql`SELECT * FROM blends WHERE id = ${id}`;
            } else if (ids) {
                const idArray = ids.split(',');
                result = await sql`SELECT * FROM blends WHERE id = ANY(${idArray})`;
            } else if (essence_id) {
                result = await sql`
                    SELECT * FROM blends 
                    WHERE head_scent_id = ${essence_id} 
                       OR heart_scent_id = ${essence_id} 
                       OR base_scent_id = ${essence_id}
                `;
            } else if (user_id) {
                result = await sql`SELECT * FROM blends WHERE user_id = ${user_id} ORDER BY name`;
            } else {
                result = await sql`SELECT * FROM blends ORDER BY name`;
            }
            return res.status(200).json(result);
        }

        if (req.method === 'POST') {
            const { name, head_scent_id, heart_scent_id, base_scent_id, resulting_family_id, user_id } = req.body;
            
            const result = await sql`
                INSERT INTO blends (name, head_scent_id, heart_scent_id, base_scent_id, resulting_family_id, user_id)
                VALUES (${name}, ${head_scent_id}, ${heart_scent_id}, ${base_scent_id}, ${resulting_family_id}, ${user_id})
                RETURNING id
            `;
            return res.status(200).json({ success: true, id: result[0].id });
        }

        if (req.method === 'PUT') {
            const { id, name, head_scent_id, heart_scent_id, base_scent_id, resulting_family_id, user_id } = req.body;
            
            await sql`
                UPDATE blends 
                SET name = ${name}, head_scent_id = ${head_scent_id}, heart_scent_id = ${heart_scent_id}, 
                    base_scent_id = ${base_scent_id}, resulting_family_id = ${resulting_family_id}, user_id = ${user_id}
                WHERE id = ${id}
            `;
            return res.status(200).json({ success: true });
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'ID mancante' });
            await sql`DELETE FROM blends WHERE id = ${id}`;
            return res.status(200).json({ success: true });
        }

        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ error: 'Method Not Allowed' });

    } catch (error) {
        console.error('[API BLENDS ERROR]', error);
        res.status(500).json({ error: error.message });
    }
}