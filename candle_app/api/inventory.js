import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    try {
        // === LETTURA (GET) ===
        if (req.method === 'GET') {
            const { id, category, user_id, ids, low_stock, threshold, family_ids, status } = req.query;
            let result;

            if (id) {
                // Lettura singolo elemento
                result = await sql`SELECT * FROM inventory WHERE id = ${id}`;
            } else if (ids) {
                // Array di ID
                const idArray = ids.split(',');
                result = await sql`SELECT * FROM inventory WHERE id = ANY(${idArray})`;
            } else if (status === 'low' && user_id) {
                // 1. IN ESAURIMENTO: Strettamente maggiore di 0 e minore del 30%
                result = await sql`
                    SELECT id FROM inventory 
                    WHERE user_id = ${user_id} 
                      AND category = 'scent' 
                      AND COALESCE(quantity_g, 0) > 0 
                      AND COALESCE(quantity_g, 0) < (COALESCE((tech_data->>'initial_quantity')::numeric, 100) * 0.3)
                `;
            } else if (status === 'empty' && user_id) {
                // 2. FINITE: Minore o uguale a 0 (cattura anche i NULL)
                result = await sql`
                    SELECT id FROM inventory 
                    WHERE user_id = ${user_id} 
                      AND category = 'scent' 
                      AND COALESCE(quantity_g, 0) <= 0
                `;
            } else if (family_ids) {
                const famArray = family_ids.split(',');
                result = await sql`SELECT name, family_id FROM inventory WHERE category = 'scent' AND family_id = ANY(${famArray})`;
            } else if (low_stock === 'true') {
                // 3. DASHBOARD: Avviso globale (include sia le esaurite che quelle sotto soglia)
                const t = parseInt(threshold) || 150;
                const uid = user_id || null;
                result = await sql`
                    SELECT id, name, quantity_g FROM inventory 
                    WHERE category != 'mold' 
                      AND (user_id = ${uid} OR ${uid} IS NULL)
                      AND COALESCE(quantity_g, 0) < CASE 
                          WHEN category = 'scent' THEN (COALESCE((tech_data->>'initial_quantity')::numeric, 100) * 0.3)
                          ELSE ${t}
                      END
                    ORDER BY COALESCE(quantity_g, 0) ASC LIMIT 5
                `;
            } else if (category && user_id) {
                // Filtro per utente e categoria
                result = await sql`SELECT * FROM inventory WHERE category = ${category} AND user_id = ${user_id} ORDER BY name`;
            } else if (category) {
                // Fallback categoria
                result = await sql`SELECT * FROM inventory WHERE category = ${category} ORDER BY name`;
            } else {
                // Lettura completa
                result = await sql`SELECT * FROM inventory ORDER BY name`;
            }
            return res.status(200).json(result);
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