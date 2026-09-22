import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const { blend_id } = req.query;
            if (!blend_id) return res.status(400).json({ error: 'blend_id mancante' });

            const result = await sql`SELECT scent_id, note_type FROM blend_scents WHERE blend_id = ${blend_id}`;
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST') {
            const { rows } = req.body;
            if (!rows || !Array.isArray(rows) || rows.length === 0) {
                return res.status(400).json({ error: 'Righe non valide' });
            }

            // Inserimento multiplo con query dinamica pulita
            for (const row of rows) {
                await sql`
                    INSERT INTO blend_scents (blend_id, scent_id, note_type)
                    VALUES (${row.blend_id}, ${row.scent_id}, ${row.note_type})
                `;
            }
            return res.status(200).json({ success: true });
        }

        if (req.method === 'DELETE') {
            const { blend_id } = req.query;
            if (!blend_id) return res.status(400).json({ error: 'blend_id mancante' });

            await sql`DELETE FROM blend_scents WHERE blend_id = ${blend_id}`;
            return res.status(200).json({ success: true });
        }

        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).json({ error: 'Method Not Allowed' });

    } catch (error) {
        console.error('[API BLEND_SCENTS ERROR]', error);
        res.status(500).json({ error: error.message });
    }
}