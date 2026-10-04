// ===================================================
// BATCH.JS - Più candele uguali: fabbisogno e scorte
// Parte dalla candela composta nel laboratorio (stato del wizard).
// ===================================================
import { createButton, createTitle } from '../components.js?v=3';
import { waxGrams, fragranceGrams, splitFragrance, formatNum, formatDrops, NOTE_LABELS, gramsToMl } from '../fragranza.js';
import * as Store from '../store.js';

const fetchJson = async (url) => {
    try { const r = await fetch(url); return r.ok ? await r.json() : []; } catch (e) { return []; }
};

export async function renderBatch(container) {
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'lab-wrapper';
    const title = createTitle('Più candele uguali', 2);
    title.classList.add('page-title');
    wrapper.appendChild(title);
    container.appendChild(wrapper);

    const wiz = Store.getWizardState();
    const { selectedMold, selectedWax, selectedEssences = [], fragrancePct = 8 } = wiz;
    if (!selectedMold || !selectedWax || selectedEssences.length === 0) {
        wrapper.innerHTML += '<p>Prima si compone la candela nel Laboratorio (stampo, cera ed essenze).</p>';
        const go = createButton('Vai al Laboratorio', 'science', 'btn-primary');
        go.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'lab' }));
        wrapper.appendChild(go);
        return;
    }

    // Scorte aggiornate dal magazzino (non quelle salvate nel wizard)
    const [waxArr, scentArr] = await Promise.all([
        fetchJson(`/api/inventory?id=${selectedWax.id}`),
        fetchJson(`/api/inventory?ids=${selectedEssences.map(e => e.id).join(',')}`)
    ]);
    const wax = waxArr[0] || selectedWax;
    const scentsById = {};
    scentArr.forEach(s => { scentsById[s.id] = s; });

    const waxPer = waxGrams(selectedMold, wax);
    const lines = splitFragrance(fragranceGrams(waxPer, fragrancePct), selectedEssences, scentsById);

    // Righe di fabbisogno: cera + una per essenza. need = grammi per candela.
    const items = [
        { name: wax.name, label: 'Cera', need: waxPer, stock: parseFloat(wax.quantity_g), perText: `${formatNum(waxPer)} g` },
        ...lines.map(l => ({
            name: l.name, label: NOTE_LABELS[l.note_type], need: l.grams,
            stock: scentsById[l.id] ? parseFloat(scentsById[l.id].quantity_g) : NaN,
            perText: formatDrops(l.drops), mlPer: l.ml, dropsPer: l.drops,
            scent: scentsById[l.id]
        }))
    ];
    // Quante candele ci stanno: minimo fra le righe con scorta nota
    const maxCandles = items.reduce((m, i) => Number.isNaN(i.stock) || i.need <= 0 ? m : Math.min(m, Math.floor(i.stock / i.need + 1e-9)), Infinity);

    const head = document.createElement('div');
    head.className = 'recipe-card';
    head.innerHTML = `<h3>${wiz.candleName || 'Candela'}</h3><p>${selectedMold.name} · ${wax.name} · ${fragrancePct}% fragranza</p>`;
    wrapper.appendChild(head);

    const qtyGrp = document.createElement('div');
    qtyGrp.className = 'input-group';
    qtyGrp.innerHTML = `<label class="input-label">Quante candele servono?</label><input class="input-field" type="number" min="1" step="1" value="${wiz.batchQty || 1}">`;
    wrapper.appendChild(qtyGrp);
    const qtyInput = qtyGrp.querySelector('input');

    const out = document.createElement('div');
    wrapper.appendChild(out);

    const render = () => {
        const n = Math.max(1, parseInt(qtyInput.value, 10) || 1);
        const rows = items.map(i => {
            const totG = i.need * n;
            const ok = Number.isNaN(i.stock) || i.stock >= totG - 1e-9;
            const totText = i.dropsPer != null
                ? `${formatDrops(Math.max(1, Math.round(i.dropsPer * n)))} (≈ ${formatNum(i.mlPer * n)} ml)`
                : `${formatNum(totG)} g`;
            const stockText = Number.isNaN(i.stock) ? '—'
                : i.scent ? `≈ ${formatNum(gramsToMl(i.stock, i.scent))} ml` : `${formatNum(i.stock)} g`;
            return `<tr class="${ok ? '' : 'stock-short'}"><td>${i.label}: ${i.name}</td><td>${i.perText}</td><td><strong>${totText}</strong></td><td>${stockText} ${ok ? '✓' : '⚠️'}</td></tr>`;
        }).join('');
        const enough = n <= maxCandles;
        const verdict = enough
            ? `<p>✅ Le scorte bastano per ${n} ${n === 1 ? 'candela' : 'candele'}${maxCandles === Infinity ? '' : ` (al massimo ${maxCandles})`}.</p>`
            : `<p>⚠️ Le scorte bastano per creare solo <strong>${maxCandles}</strong> ${maxCandles === 1 ? 'candela' : 'candele'}, non ${n}.</p>`;
        out.innerHTML = `
            <div class="recipe-card">
                <table style="width:100%;border-collapse:collapse;text-align:left">
                    <thead><tr><th>Ingrediente</th><th>1 candela</th><th>${n} candele</th><th>In magazzino</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div class="lab-warning" style="display:block">${verdict}</div>`;
    };
    qtyInput.oninput = render;
    render();

    const btns = document.createElement('div');
    btns.className = 'btn-container';
    const back = createButton('Indietro', 'arrow_back', 'btn-secondary');
    back.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'lab' }));
    btns.appendChild(back);
    wrapper.appendChild(btns);
}
