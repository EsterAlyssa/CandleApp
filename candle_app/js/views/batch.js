// ===================================================
// BATCH.JS - Più candele uguali: fabbisogno e scorte
// Parte dalla candela composta nel laboratorio (stato del wizard).
// ===================================================
import { createButton, createTitle } from '../components.js?v=3';
import { waxGrams, fragranceGrams, splitFragrance, consumeScents, formatNum, formatDrops, NOTE_LABELS, gramsToMl } from '../fragranza.js';
import { findDuplicateBlend, saveBlendScents } from '../blends.js';
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
        { name: wax.name, label: 'Cera', need: waxPer, stock: parseFloat(wax.quantity_g) || 0, perText: `${formatNum(waxPer)} g` },
        ...lines.map(l => ({
            name: l.name, label: NOTE_LABELS[l.note_type], need: l.grams,
            stock: parseFloat(scentsById[l.id]?.quantity_g) || 0,
            perText: formatDrops(l.drops), mlPer: l.ml, dropsPer: l.drops,
            scent: scentsById[l.id]
        }))
    ];
    // Quante candele ci stanno: minimo fra le righe con scorta nota
    const capOf = (i) => Math.floor(i.stock / i.need + 1e-9);
    const maxCandles = items.reduce((m, i) => i.need <= 0 ? m : Math.min(m, capOf(i)), Infinity);
    // Ingrediente che limita (il primo a finire)
    const limiting = items.filter(i => i.need > 0 && capOf(i) === maxCandles).map(i => i.name);
    const limitText = limiting.length ? ` Ingrediente che limita: ${limiting.join(', ')}.` : '';

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
            const ok = i.stock >= totG - 1e-9;
            const totText = i.dropsPer != null
                ? `${formatDrops(Math.max(1, Math.round(i.dropsPer * n)))} (≈ ${formatNum(i.mlPer * n)} ml)`
                : `${formatNum(totG)} g`;
            const stockText = i.scent ? `in magazzino ≈ ${formatNum(gramsToMl(i.stock, i.scent))} ml` : `in magazzino ${formatNum(i.stock)} g`;
            return `<li class="batch-item ${ok ? 'ok' : 'ko'}">
                <div class="batch-info">
                    <div class="batch-name">${i.label}: ${i.name}</div>
                    <div class="batch-qty">1 candela: ${i.perText}</div>
                    <div class="batch-qty">${n} ${n === 1 ? 'candela' : 'candele'}: <strong>${totText}</strong></div>
                    <div class="batch-stock">${stockText}</div>
                </div>
                <span class="batch-mark">${ok ? '✓' : '✗'}</span>
            </li>`;
        }).join('');
        const enough = n <= maxCandles;
        const verdict = enough
            ? `Le scorte bastano per ${n} ${n === 1 ? 'candela' : 'candele'}${maxCandles === Infinity ? '' : `. Se ne possono fare al massimo ${maxCandles}`}.${maxCandles === Infinity ? '' : limitText}`
            : `Le scorte bastano per creare solo <strong>${maxCandles}</strong> ${maxCandles === 1 ? 'candela' : 'candele'}, non ${n}.${limitText}`;
        out.innerHTML = `
            <ul class="batch-list">${rows}</ul>
            <div class="batch-verdict ${enough ? 'ok' : 'ko'}"><span class="batch-mark">${enough ? '✓' : '✗'}</span><span>${verdict}</span></div>`;
    };
    qtyInput.oninput = render;
    render();

    const btns = document.createElement('div');
    btns.className = 'btn-container';
    const back = createButton('Indietro', 'arrow_back', 'btn-secondary');
    back.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'lab' }));
    btns.appendChild(back);

    // Conferma: registra una candela nello storico ("ne sono state fatte N")
    // e scala dal magazzino cera ed essenze per tutte le N
    const confirm = createButton('Conferma e registra', 'check', 'btn-primary');
    confirm.onclick = async () => {
        const user = JSON.parse(localStorage.getItem('candle_user') || 'null');
        if (!user?.id) { alert('Devi essere loggato!'); return; }
        const n = Math.max(1, parseInt(qtyInput.value, 10) || 1);
        if (n > maxCandles) {
            alert(`Le scorte bastano per ${maxCandles} ${maxCandles === 1 ? 'candela' : 'candele'}, non ${n}.`);
            return;
        }
        if (!window.confirm(`Registrare ${n} ${n === 1 ? 'candela' : 'candele'} nello storico e scalarle dal magazzino?`)) return;
        confirm.disabled = true;
        try {
            // Mix: riusa quello identico se esiste, altrimenti lo crea
            const byNote = (t) => selectedEssences.find(e => e.note_type === t)?.id || null;
            const famCounts = {};
            selectedEssences.forEach(e => { if (e.family_id) famCounts[e.family_id] = (famCounts[e.family_id] || 0) + 1; });
            const familyId = Object.entries(famCounts).sort((a, b) => b[1] - a[1]).map(([f]) => f)[0] || null;

            const existingMix = await findDuplicateBlend(user.id, selectedEssences, null);
            let blendId = existingMix?.id || null;
            if (!blendId) {
                const r = await fetch('/api/blends', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: user.id, name: (wiz.candleName || '').trim() || 'Candela',
                        head_scent_id: byNote('head'), heart_scent_id: byNote('heart'),
                        base_scent_id: byNote('base'), resulting_family_id: familyId
                    })
                });
                if (!r.ok) throw new Error('creazione del mix non riuscita');
                blendId = (await r.json()).id;
                await saveBlendScents(blendId, selectedEssences);
            }

            // Numero di lotto: successivo all'ultimo registrato
            let batchNumber = 1;
            const last = await fetchJson(`/api/candles?user_id=${user.id}&limit=1`);
            if (last.length) {
                const parsed = parseInt(String(last[0].batch_number).replace(/[^0-9]/g, ''), 10);
                if (!Number.isNaN(parsed)) batchNumber = parsed + 1;
            }

            const logRes = await fetch('/api/candles', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id, mold_id: selectedMold.id, wax_id: wax.id, blend_id: blendId,
                    total_wax_used: waxPer, fragrance_load_percent: fragrancePct,
                    notes: `Di questa ne sono state fatte ${n}.`, batch_number: batchNumber
                })
            });
            if (!logRes.ok) throw new Error('registrazione nello storico non riuscita');
            const savedLogId = (await logRes.json()).id;

            const newWax = Math.max(0, Math.round((parseFloat(wax.quantity_g) - waxPer * n) * 100) / 100);
            const res = await fetch('/api/inventory', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...wax, quantity_g: newWax })
            });
            if (!res.ok) throw new Error('aggiornamento cera non riuscito');
            await consumeScents(lines.map(l => ({ ...l, grams: l.grams * n })), scentsById);
            Store.resetWizard();
            alert(`Registrata nello storico: ne sono state fatte ${n}. Magazzino aggiornato.`);
            window.dispatchEvent(new CustomEvent('navigate', { detail: `guide:${savedLogId}` }));
        } catch (e) {
            confirm.disabled = false;
            alert(`Errore: ${e.message}`);
        }
    };
    btns.appendChild(confirm);
    wrapper.appendChild(btns);
}
