// ===================================================
// BLENDS.JS - Helper per la tabella ponte blend_scents
// Gestisce l'associazione di PIÙ essenze per nota a un blend
// (superando il limite delle colonne singole head/heart/base_scent_id).
// ===================================================

import { NOTE_ORDER, NOTE_LABELS } from './fragranza.js';
import { findScentPreset } from './presets.js';

// --- Essenze senza nota olfattiva ---
// La nota dipende dalla volatilità della singola materia: non esiste un
// valore di ripiego corretto, quindi si chiede all'utente. Se il nome è nel
// catalogo dei preset, la nota del preset viene proposta come consigliata.
export function notePickerHtml(scent) {
    const suggested = findScentPreset(scent?.name)?.note || '';
    const buttons = NOTE_ORDER.map(nt =>
        `<button type="button" class="note-pick-btn${nt === suggested ? ' suggested' : ''}" data-note="${nt}">${NOTE_LABELS[nt]}${nt === suggested ? ' ✓' : ''}</button>`
    ).join('');
    return `<div class="note-picker"><span class="note-picker-label">Nota da assegnare${suggested ? ' (✓ consigliata)' : ''}:</span><div class="note-picker-btns">${buttons}</div></div>`;
}

// Salva la nota sull'essenza in magazzino (aggiorna anche l'oggetto passato).
export async function assignScentNote(scent, noteType) {
    const tech_data = { ...(scent.tech_data || {}), note_type: noteType };
    const res = await fetch('/api/inventory', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...scent, tech_data })
    });
    if (!res.ok) throw new Error('Impossibile salvare la nota');
    scent.tech_data = tech_data;
}

// Essenze selezionate ancora senza nota (non entrerebbero nelle dosi né nel mix).
export const essencesWithoutNote = (selectedEssences) =>
    (selectedEssences || []).filter(e => !NOTE_ORDER.includes(e.note_type));

const VALID_NOTES = NOTE_ORDER;

// Riepilogo della selezione: per ogni nota tutte le essenze scelte.
export function selectionSummaryHtml(selectedEssences) {
    return NOTE_ORDER.map(nt => {
        const names = (selectedEssences || []).filter(e => e.note_type === nt).map(e => e.name);
        return `
            <div class="selection-row ${names.length > 0 ? 'filled' : 'empty'}">
                <span class="note-label">${NOTE_LABELS[nt]}:</span>
                <span class="note-value">${names.length > 0 ? names.join(', ') : '(non selezionata)'}</span>
            </div>`;
    }).join('');
}

// Avviso se manca almeno una delle tre note (null se la fragranza è completa).
export function missingNotesWarning(selectedEssences) {
    const list = selectedEssences || [];
    if (list.length === 0) return null;
    const missing = NOTE_ORDER.filter(nt => !list.some(e => e.note_type === nt));
    if (missing.length === 0) return null;
    const names = missing.map(nt => NOTE_LABELS[nt].toLowerCase()).join(' e di ');
    const head = missing.length === 1 ? 'Manca la nota' : 'Mancano le note';
    return `⚠️ ${head} di ${names}. Per una fragranza completa serve almeno un'essenza per ciascuna nota (testa, cuore e fondo); per ogni nota se ne possono scegliere più d'una.`;
}

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