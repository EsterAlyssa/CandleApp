import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    try {
        // === LETTURA (GET) ===
        if (req.method === 'GET') {
            const { id, category, user_id, ids, low_stock, threshold, family_ids, status } = req.query;
            let result;

            if (status === 'low' && user_id) {
                result = await sql`SELECT id FROM inventory WHERE user_id = ${user_id} AND category = 'scent' AND quantity_g < 100 AND quantity_g > 0`;
            } else if (status === 'empty' && user_id) {
                result = await sql`SELECT id FROM inventory WHERE user_id = ${user_id} AND category = 'scent' AND quantity_g <= 0`;
            }
            
            if (id) {
                // Lettura singolo elemento (usato in add_essence in modalità edit)
                result = await sql`SELECT * FROM inventory WHERE id = ${id}`;
            } else if (ids) {
                // Modifica Vercel Postgres array: convertiamo stringa "id1,id2" in array
                const idArray = ids.split(',');
                result = await sql`SELECT * FROM inventory WHERE id = ANY(${idArray})`;
            } else if (family_ids) {
                // logica per pairings
                const famArray = family_ids.split(',');
                result = await sql`SELECT name, family_id FROM inventory WHERE category = 'scent' AND family_id = ANY(${famArray})`;
            } else if (low_stock === 'true') {
                // logica per Dashboard Alerts
                const t = parseInt(threshold) || 150;
                result = await sql`SELECT id, name, quantity_g FROM inventory WHERE quantity_g < ${t} ORDER BY quantity_g ASC LIMIT 5`;
            } else if (category && user_id) {
                // Lettura magazzino filtrata per utente e categoria
                result = await sql`SELECT * FROM inventory WHERE category = ${category} AND user_id = ${user_id} ORDER BY name`;
            } else if (category) {
                // Fallback categoria
                result = await sql`SELECT * FROM inventory WHERE category = ${category} ORDER BY name`;
            } else {
                // Lettura completa
                result = await sql`SELECT * FROM inventory ORDER BY name`;
            }
            return res.status(200).json(result.rows);
        }

        // === CREAZIONE (POST) ===
        if (req.method === 'POST') {
            const { user_id, name, category, quantity_g, supplier, family_id, tech_data, image_ref } = req.body;
            const techDataJson = tech_data ? JSON.stringify(tech_data) : null;
            
            await sql`
                INSERT INTO inventory (user_id, name, category, quantity_g, supplier, family_id, tech_data, image_ref)
                VALUES (${user_id}, ${name}, ${category}, ${quantity_g}, ${supplier}, ${family_id}, ${techDataJson}::jsonb, ${image_ref})
            `;
            return res.status(200).json({ success: true });
        }

        // === MODIFICA (PUT) ===
        if (req.method === 'PUT') {
            const { id, user_id, name, category, quantity_g, supplier, family_id, tech_data, image_ref } = req.body;
            const techDataJson = tech_data ? JSON.stringify(tech_data) : null;

            await sql`
                UPDATE inventory 
                SET user_id = ${user_id}, name = ${name}, category = ${category}, 
                    quantity_g = ${quantity_g}, supplier = ${supplier}, family_id = ${family_id}, 
                    tech_data = ${techDataJson}::jsonb, image_ref = ${image_ref}
                WHERE id = ${id}
            `;
            return res.status(200).json({ success: true });
        }

        // === ELIMINAZIONE (DELETE) ===
        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'ID mancante per eliminazione' });
            
            await sql`DELETE FROM inventory WHERE id = ${id}`;
            return res.status(200).json({ success: true });
        }

        // Se arriva un metodo non supportato
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ error: `Metodo ${req.method} non consentito` });

    } catch (error) {
        console.error('[API INVENTORY ERROR]', error);
        res.status(500).json({ error: error.message });
    }
}