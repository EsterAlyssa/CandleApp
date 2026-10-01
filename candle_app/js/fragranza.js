// ===================================================
// FRAGRANZA.JS - Dosi della candela e conversione in gocce
// Unico punto di calcolo: lo usano il wizard (lab), la guida
// di colata e il dettaglio candela.
// Il sistema ragiona in grammi; all'utente si mostrano gocce
// (con i ml come riferimento), perché le boccette hanno il
// contagocce e non si pesano.
// ===================================================

// Piramide olfattiva: quota della fragranza destinata a ciascuna nota.
// Regola classica 30/50/20 (testa/cuore/fondo): il cuore definisce il
// carattere, il fondo si dosa meno perché le molecole pesanti sono più intense.
// Se una nota manca, le quote delle note presenti vengono rinormalizzate.
// Dentro una nota la quota si divide in parti uguali fra le sue essenze.
export const NOTE_RATIOS = { head: 0.3, heart: 0.5, base: 0.2 };
export const NOTE_ORDER = ['head', 'heart', 'base'];
export const NOTE_LABELS = { head: 'Testa', heart: 'Cuore', base: 'Fondo' };

// Valori indicativi, modificabili per singola essenza in magazzino
// (tech_data.density e tech_data.drops_per_ml).
// Densità: la maggior parte degli oli essenziali sta fra 0,85 e 0,95 g/ml
// (agrumi ~0,85-0,89); fanno eccezione quelli ricchi di eugenolo, come il
// chiodo di garofano (~1,04-1,06), per cui conviene indicarla a mano.
export const DEFAULT_DENSITY = 0.9;
// Gocce: lo standard di Farmacopea (20 gocce/ml) vale per l'acqua; gli oli
// essenziali hanno tensione superficiale più bassa e fanno gocce più piccole.
// Le misure del Tisserand Institute danno in media 30 gocce/ml (da 20 a 40
// secondo olio e contagocce).
export const DEFAULT_DROPS_PER_ML = 30;

const positive = (v, fallback) => {
    const n = parseFloat(v);
    return n > 0 ? n : fallback;
};

export const densityOf = (scent) => positive(scent?.tech_data?.density, DEFAULT_DENSITY);
export const dropsPerMlOf = (scent) => positive(scent?.tech_data?.drops_per_ml, DEFAULT_DROPS_PER_ML);

export const gramsToMl = (grams, scent) => grams / densityOf(scent);
export const mlToGrams = (ml, scent) => ml * densityOf(scent);

// Numeri all'italiana (virgola decimale), al massimo una cifra dopo la virgola.
export const formatNum = (n, digits = 1) =>
    Number(n || 0).toLocaleString('it-IT', { maximumFractionDigits: digits });

export const formatDrops = (drops) => `${drops} ${drops === 1 ? 'goccia' : 'gocce'}`;

// --- Cera e fragranza totali ---
// Cera = capacità stampo (g d'acqua) × fattore di conversione della cera.
export function waxGrams(mold, wax) {
    const cap = mold?.quantity_g || 100;
    const factor = wax?.tech_data?.conversion_factor || 0.90;
    return Math.round(cap * factor);
}

// Fragranza = percentuale sulla cera (non arrotondata: la ripartizione
// fra le essenze parte dal valore esatto, si arrotonda solo in uscita).
export const fragranceGrams = (waxG, pct) => waxG * pct / 100;

// Ripartisce i grammi di fragranza fra le essenze selezionate.
// essences: [{ id, name, note_type }]
// scentsById: { [id]: record di inventario } per densità e contagocce.
// Le essenze senza nota olfattiva non entrano nella ripartizione.
export function splitFragrance(fragG, essences, scentsById = {}) {
    const list = essences || [];
    const present = NOTE_ORDER.filter(nt => list.some(e => e.note_type === nt));
    const totRatio = present.reduce((s, nt) => s + NOTE_RATIOS[nt], 0);
    const lines = [];

    present.forEach(nt => {
        const inNote = list.filter(e => e.note_type === nt);
        const gramsEach = fragG * (NOTE_RATIOS[nt] / totRatio) / inNote.length;
        inNote.forEach(e => {
            const scent = scentsById[e.id];
            const ml = gramsToMl(gramsEach, scent);
            const drops = gramsEach > 0 ? Math.max(1, Math.round(ml * dropsPerMlOf(scent))) : 0;
            lines.push({ id: e.id, name: e.name, note_type: nt, grams: gramsEach, ml, drops });
        });
    });
    return lines;
}

export const totalDrops = (lines) => lines.reduce((s, l) => s + l.drops, 0);
export const totalMl = (lines) => lines.reduce((s, l) => s + l.ml, 0);

// Dose leggibile: le gocce in evidenza, i ml come riferimento.
export const doseHtml = (line) =>
    `<strong>${formatDrops(line.drops)}</strong> <span class="dose-ml">(≈ ${formatNum(line.ml)} ml)</span>`;

// Essenze di cui in magazzino ne resta meno di quanto serve.
export function shortages(lines, scentsById = {}) {
    return (lines || []).filter(l => {
        const q = scentsById[l.id]?.quantity_g;
        return q != null && q < l.grams;
    }).map(l => ({ ...l, availableMl: gramsToMl(scentsById[l.id].quantity_g || 0, scentsById[l.id]) }));
}

export function shortageWarningHtml(lines, scentsById) {
    const short = shortages(lines, scentsById);
    if (short.length === 0) return '';
    const items = short.map(l => `${l.name}: ne restano ≈ ${formatNum(l.availableMl)} ml, ne servono ≈ ${formatNum(l.ml)} ml`);
    return `<p>⚠️ Essenze non sufficienti in magazzino:</p><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
}

// Scala dal magazzino i grammi usati di ogni essenza (non si scende sotto zero).
export async function consumeScents(lines, scentsById = {}) {
    for (const l of lines || []) {
        const scent = scentsById[l.id];
        if (!scent || scent.quantity_g == null) continue;
        const newQty = Math.max(0, Math.round((parseFloat(scent.quantity_g) - l.grams) * 100) / 100);
        try {
            const res = await fetch('/api/inventory', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...scent, quantity_g: newQty })
            });
            if (res.ok) scent.quantity_g = newQty;
        } catch (e) {
            console.warn('[FRAGRANZA] Impossibile scalare lo stock di', scent.name, e);
        }
    }
}

// Totale fragranza: in gocce se ci sono essenze, altrimenti in grammi.
export function fragranceTotalHtml(fragG, lines, pct) {
    if (!lines || lines.length === 0) return `<strong>${Math.round(fragG)} g</strong> (${pct}% della cera)`;
    return `<strong>${formatDrops(totalDrops(lines))}</strong> in tutto (≈ ${formatNum(totalMl(lines))} ml, ${pct}% della cera)`;
}

// Elenco delle dosi raggruppato per nota (testa, cuore, fondo).
export function doseListHtml(lines, listClass = 'dose-list') {
    if (!lines || lines.length === 0) return '';
    const items = NOTE_ORDER.flatMap(nt =>
        lines.filter(l => l.note_type === nt).map(l =>
            `<li><span class="dose-note">${NOTE_LABELS[nt]}</span> ${l.name}: ${doseHtml(l)}</li>`
        )
    );
    return `<ul class="${listClass}">${items.join('')}</ul>`;
}
