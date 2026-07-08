// ===================================================
// BLENDS.JS - Helper per la tabella ponte blend_scents
// Gestisce l'associazione di PIÙ essenze per nota a un blend
// (superando il limite delle colonne singole head/heart/base_scent_id).
// ===================================================

import { supabase } from './supabase.js';

const VALID_NOTES = ['head', 'heart', 'base'];

// Sostituisce completamente le essenze associate a un blend.
export async function saveBlendScents(blendId, essences) {
    if (!blendId) return;

    const { error: delErr } = await supabase.from('blend_scents').delete().eq('blend_id', blendId);
    if (delErr) {
        console.warn('[BLENDS] Impossibile ripulire blend_scents', delErr);
        return; // se non riusciamo a ripulire, non inseriamo per evitare duplicati
    }

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

    const { error: insErr } = await supabase.from('blend_scents').insert(rows);
    if (insErr) console.warn('[BLENDS] Impossibile inserire blend_scents', insErr);
}

// Ritorna le righe grezze { scent_id, note_type } di un blend.
export async function loadBlendScents(blendId) {
    if (!blendId) return [];
    const { data, error } = await supabase
        .from('blend_scents')
        .select('scent_id, note_type')
        .eq('blend_id', blendId);
    if (error) {
        console.warn('[BLENDS] Impossibile caricare blend_scents', error);
        return [];
    }
    return data || [];
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
