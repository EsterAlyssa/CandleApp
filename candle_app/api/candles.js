import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const { id, user_id, blend_ids, limit, count } = req.query;
            let result;
            const limitNum = parseInt(limit) || 50;

            if (count === 'true' && user_id) {
                result = await sql`SELECT COUNT(*) as count FROM candle_log WHERE user_id = ${user_id}`;
                return res.status(200).json({ count: parseInt(result.rows[0].count, 10) });
            }
            
            if (id) {
                result = await sql`SELECT * FROM candle_log WHERE id = ${id}`;
            } else if (blend_ids && user_id) {
                const idArray = blend_ids.split(',');
                result = await sql`SELECT * FROM candle_log WHERE user_id = ${user_id} AND blend_id = ANY(${idArray}) ORDER BY created_at DESC LIMIT ${limitNum}`;
            } else if (user_id) {
                result = await sql`SELECT * FROM candle_log WHERE user_id = ${user_id} ORDER BY created_at DESC LIMIT ${limitNum}`;
            } else {
                result = await sql`SELECT * FROM candle_log ORDER BY created_at DESC LIMIT ${limitNum}`;
            }
            return res.status(200).json(result.rows);
        }

        // NUOVA LOGICA POST
        if (req.method === 'POST') {
            const { user_id, mold_id, wax_id, blend_id, total_wax_used, fragrance_load_percent, notes, batch_number, is_favorite, image_ref } = req.body;
            
            const result = await sql`
                INSERT INTO candle_log (user_id, mold_id, wax_id, blend_id, total_wax_used, fragrance_load_percent, notes, batch_number, is_favorite, image_ref)
                VALUES (${user_id}, ${mold_id}, ${wax_id}, ${blend_id}, ${total_wax_used}, ${fragrance_load_percent}, ${notes}, ${batch_number}, ${is_favorite || false}, ${image_ref})
                RETURNING id
            `;
            return res.status(200).json({ success: true, id: result.rows[0].id });
        }

        if (req.method === 'PUT') {
            const { id, user_id, mold_id, wax_id, blend_id, total_wax_used, fragrance_load_percent, notes, batch_number, rating } = req.body;
            if (!id) return res.status(400).json({ error: 'ID richiesto' });

            // Se vengono passati i parametri completi da lab.js, facciamo un update completo
            if (mold_id !== undefined) {
                await sql`
                    UPDATE candle_log 
                    SET user_id = ${user_id}, mold_id = ${mold_id}, wax_id = ${wax_id}, 
                        blend_id = ${blend_id}, total_wax_used = ${total_wax_used}, 
                        fragrance_load_percent = ${fragrance_load_percent}, notes = ${notes}, batch_number = ${batch_number}
                    WHERE id = ${id}
                `;
            } else {
                // Update parziale da candle_detail.js
                if (notes !== undefined && rating !== undefined) {
                    await sql`UPDATE candle_log SET notes = ${notes}, rating = ${rating} WHERE id = ${id}`;
                } else if (notes !== undefined) {
                    await sql`UPDATE candle_log SET notes = ${notes} WHERE id = ${id}`;
                } else if (rating !== undefined) {
                    await sql`UPDATE candle_log SET rating = ${rating} WHERE id = ${id}`;
                }
            }
            return res.status(200).json({ success: true });
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'ID mancante' });
            await sql`DELETE FROM candle_log WHERE id = ${id}`;
            return res.status(200).json({ success: true });
        }

        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ error: 'Method Not Allowed' });

    } catch (error) {
        console.error('[API CANDLES ERROR]', error);
        res.status(500).json({ error: error.message });
    }
}