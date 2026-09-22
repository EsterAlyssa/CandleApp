// ===================================================
// BLENDS.JS - Helper per la tabella ponte blend_scents
// Gestisce l'associazione di PIÙ essenze per nota a un blend
// (superando il limite delle colonne singole head/heart/base_scent_id).
// ===================================================

const VALID_NOTES = ['head', 'heart', 'base'];

// Sostituisce completamente le essenze associate a un blend.
export async function saveBlendScents(blendId, essences) {
    if (!blendId) return;

    try {
        // PONTE API: Delete associazioni esistenti
        await fetch(`/api/blend-scents?blend_id=${blendId}`, { method: 'DELETE' });

        // Deduplica per (scent_id, note_type) e tiene solo note valide
        const seen = new Set();
        const rows = [];
        (essences || []).forEach(e => {
            if (!e || !e.id || !VALID_NOTES.includes(e.note_type)) return;
            const key = `${e.id}:${e.note_type}`;
            if (seen.has(key)) return;
            seen.add(key);
            rows.push({ blend_id: blendId, scent_id: e.id, note_type: e.note_type });
        });

        if (rows.length === 0) return;

        // PONTE API: Insert nuove associazioni in batch
        const res = await fetch('/api/blend-scents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows })
        });

        if (!res.ok) throw new Error('Errore inserimento blend_scents');
    } catch (err) {
        console.warn('[BLENDS] Impossibile salvare blend_scents', err);
    }
}

// Ritorna le righe grezze { scent_id, note_type } di un blend.
export async function loadBlendScents(blendId) {
    if (!blendId) return [];
    try {
        // PONTE API: Fetch blend_scents
        const res = await fetch(`/api/blend-scents?blend_id=${blendId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data || [];
    } catch (error) {
        console.warn('[BLENDS] Impossibile caricare blend_scents', error);
        return [];
    }
}

// Converte righe blend_scents in oggetti selectedEssences pronti per la UI.
export function mapScentRows(rows, essences, familiesMap) {
    const result = [];
    (rows || []).forEach(r => {
        const e = (essences || []).find(x => x.id === r.scent_id);
        if (!e) return;
        result.push({
            id: e.id,
            name: e.name,
            family_name: e.family_id ? (familiesMap[e.family_id] || '') : '',
            family_id: e.family_id,
            note_type: r.note_type
        });
    });
    return result;
}

// Carica le essenze di un blend preferendo blend_scents; se vuoto
// (blend vecchio non ancora migrato) usa il fallback passato.
export async function loadBlendEssences(blendId, essences, familiesMap, fallback = []) {
    const rows = await loadBlendScents(blendId);
    if (rows.length > 0) {
        return mapScentRows(rows, essences, familiesMap);
    }
    return fallback;
}