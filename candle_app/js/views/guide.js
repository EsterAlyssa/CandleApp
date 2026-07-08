// ===================================================
// GUIDE.JS - Guida di colata passo-passo
// Parte dopo la creazione di una nuova candela e accompagna
// la preparazione usando i dati della ricetta appena salvata.
// ===================================================

import { supabase } from '../supabase.js';
import { createButton, createTitle } from '../components.js?v=3';
import { loadBlendScents } from '../blends.js';

export async function renderGuide(container, logId) {
    console.log('[VIEW] Rendering Guide...', logId);
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'lab-wrapper';

    if (!logId) {
        wrapper.innerHTML = '<p class="error-text">Candela non specificata.</p>';
        container.appendChild(wrapper);
        return;
    }

    // --- Carica la candela ---
    const { data: log, error: logError } = await supabase.from('candle_log').select('*').eq('id', logId).single();
    if (logError || !log) {
        wrapper.innerHTML = '<p class="error-text">Impossibile caricare la candela.</p>';
        container.appendChild(wrapper);
        return;
    }

    // --- Carica stampo, cera, blend ---
    const [moldResp, waxResp, blendResp] = await Promise.all([
        log.mold_id ? supabase.from('inventory').select('id, name, quantity_g, tech_data').eq('id', log.mold_id).maybeSingle() : { data: null },
        log.wax_id ? supabase.from('inventory').select('id, name, tech_data').eq('id', log.wax_id).maybeSingle() : { data: null },
        log.blend_id ? supabase.from('blends').select('id, name, head_scent_id, heart_scent_id, base_scent_id').eq('id', log.blend_id).maybeSingle() : { data: null }
    ]);
    const mold = moldResp.data;
    const wax = waxResp.data;
    const blend = blendResp.data;

    // --- Essenze del blend (tabella ponte, fallback colonne singole) ---
    let scentRows = blend ? await loadBlendScents(blend.id) : [];
    if (scentRows.length === 0 && blend) {
        scentRows = [
            blend.head_scent_id ? { scent_id: blend.head_scent_id, note_type: 'head' } : null,
            blend.heart_scent_id ? { scent_id: blend.heart_scent_id, note_type: 'heart' } : null,
            blend.base_scent_id ? { scent_id: blend.base_scent_id, note_type: 'base' } : null
        ].filter(Boolean);
    }
    const scentIds = Array.from(new Set(scentRows.map(r => r.scent_id).filter(Boolean)));
    const scentsResp = await (scentIds.length > 0 ? supabase.from('inventory').select('id, name').in('id', scentIds) : { data: [] });
    const scentMap = {};
    (scentsResp.data || []).forEach(s => { scentMap[s.id] = s.name; });

    // --- Calcolo quantità (stessa formula del wizard) ---
    const cap = mold?.quantity_g || 100;
    const waxFactor = wax?.tech_data?.conversion_factor || 0.90;
    const waxAmt = Math.round(cap * waxFactor);
    const fragPct = typeof log.fragrance_load_percent === 'number' ? log.fragrance_load_percent : 8;
    const fragAmt = log.total_wax_used
        ? Math.round(log.total_wax_used * fragPct / 100)
        : Math.round(waxAmt * fragPct / 100);
    const effectiveWax = log.total_wax_used || waxAmt;

    const meltTemp = wax?.tech_data?.melt_temp;
    const pourTemp = wax?.tech_data?.pour_temp;

    // --- Ripartizione fragranza per nota (testa/cuore/fondo) ---
    const noteRatios = { head: 0.25, heart: 0.5, base: 0.25 };
    const byNote = { head: [], heart: [], base: [] };
    scentRows.forEach(r => {
        if (byNote[r.note_type]) byNote[r.note_type].push(scentMap[r.scent_id] || r.scent_id);
    });
    const availableTypes = Object.keys(byNote).filter(t => byNote[t].length > 0);
    let ratios = { ...noteRatios };
    if (availableTypes.length > 0 && availableTypes.length < 3) {
        const tot = availableTypes.reduce((s, t) => s + noteRatios[t], 0);
        ratios = availableTypes.reduce((acc, t) => { acc[t] = noteRatios[t] / tot; return acc; }, {});
    }
    const ingredientLines = [];
    availableTypes.forEach(t => {
        const names = byNote[t];
        const typeTotal = fragAmt * (ratios[t] || 0);
        const per = names.length > 0 ? Math.round((typeTotal / names.length) * 10) / 10 : 0;
        names.forEach(n => ingredientLines.push(`${n}: ${per} g`));
    });

    // --- Definizione degli step ---
    const li = (arr) => `<ul class="guide-list">${arr.map(x => `<li>${x}</li>`).join('')}</ul>`;
    const steps = [
        {
            icon: 'checklist',
            title: 'Occorrente',
            body: `
                <p>Prepara tutto il necessario per <strong>${log.batch_number ? 'la Candela ' + log.batch_number : 'la candela'}</strong>${blend?.name ? ` — <em>${blend.name}</em>` : ''}.</p>
                ${li([
                    `Stampo: <strong>${mold?.name || '—'}</strong> (capacità ${cap} g)`,
                    `Cera: <strong>${wax?.name || '—'}</strong> — <strong>${effectiveWax} g</strong>`,
                    `Fragranza: <strong>${fragAmt} g</strong> (${fragPct}% della cera)`,
                    `Termometro, contenitore per bagnomaria, stoppino, spatola`
                ])}
            `
        },
        {
            icon: 'local_fire_department',
            title: 'Sciogli la cera',
            body: `
                <p>Metti <strong>${effectiveWax} g</strong> di <strong>${wax?.name || 'cera'}</strong> in un contenitore e scioglila a bagnomaria, mescolando dolcemente.</p>
                ${li([
                    meltTemp ? `Porta la cera fino a circa <strong>${meltTemp} °C</strong> finché è completamente fusa e limpida` : `Scalda finché la cera è completamente fusa e limpida`,
                    `Evita il surriscaldamento: togli dal fuoco appena è tutta sciolta`
                ])}
            `
        },
        {
            icon: 'science',
            title: 'Aggiungi la fragranza',
            body: `
                <p>${pourTemp ? `Lascia intiepidire la cera fino a circa <strong>${pourTemp} °C</strong>, poi aggiungi` : 'Quando la cera si è leggermente raffreddata, aggiungi'} <strong>${fragAmt} g</strong> di fragranza e mescola con cura per 1-2 minuti.</p>
                ${ingredientLines.length > 0 ? `<p class="guide-sub">Dosi per essenza:</p>${li(ingredientLines)}` : ''}
                <p class="guide-note">Una miscelazione accurata garantisce una resa olfattiva uniforme.</p>
            `
        },
        {
            icon: 'opacity',
            title: 'Versa nello stampo',
            body: `
                <p>Posiziona lo stoppino al centro dello stampo e versa lentamente la cera profumata.</p>
                ${li([
                    pourTemp ? `Versa intorno a <strong>${pourTemp} °C</strong> per evitare crepe e cavità` : `Versa a temperatura moderata per evitare crepe`,
                    `Mantieni lo stoppino dritto e centrato (usa un supporto se serve)`
                ])}
            `
        },
        {
            icon: 'schedule',
            title: 'Raffreddamento e cura',
            body: `
                <p>Lascia raffreddare la candela a temperatura ambiente, lontano da correnti d'aria.</p>
                ${li([
                    `Raffreddamento completo: alcune ore, senza spostarla`,
                    `Cura (curing): lascia riposare <strong>1-2 settimane</strong> prima di accenderla, per una fragranza al massimo`,
                    `Alla prima accensione, lascia formare la piscina di cera su tutta la superficie`
                ])}
                <p class="guide-note">Buon lavoro! 🕯️ Potrai valutare e annotare il risultato dal dettaglio della candela.</p>
            `
        }
    ];

    let current = 0;

    const title = createTitle('Guida di colata', 2);
    title.classList.add('page-title');
    wrapper.appendChild(title);

    const progress = document.createElement('div');
    progress.className = 'guide-progress';
    wrapper.appendChild(progress);

    const content = document.createElement('div');
    content.className = 'guide-content';
    wrapper.appendChild(content);

    const btns = document.createElement('div');
    btns.className = 'btn-container';
    btns.style.display = 'flex';
    btns.style.gap = '8px';
    btns.style.marginTop = '16px';
    wrapper.appendChild(btns);

    function renderStep() {
        const s = steps[current];

        // Progress dots
        progress.innerHTML = steps.map((_, i) =>
            `<span class="guide-dot${i === current ? ' active' : ''}${i < current ? ' done' : ''}"></span>`
        ).join('') + `<span class="guide-step-count">${current + 1} / ${steps.length}</span>`;

        // Content
        content.innerHTML = `
            <div class="guide-step">
                <div class="guide-step-head">
                    <span class="material-symbols-outlined guide-step-icon">${s.icon}</span>
                    <h3 class="guide-step-title">${s.title}</h3>
                </div>
                <div class="guide-step-body">${s.body}</div>
            </div>
        `;

        // Buttons
        btns.innerHTML = '';
        if (current > 0) {
            const back = createButton('Indietro', 'arrow_back', 'btn-secondary');
            back.style.flex = '1';
            back.onclick = () => { current--; renderStep(); };
            btns.appendChild(back);
        }
        const isLast = current === steps.length - 1;
        const next = createButton(isLast ? 'Vai alla candela' : 'Avanti', isLast ? 'check' : 'arrow_forward', 'btn-primary');
        next.style.flex = '1';
        next.onclick = () => {
            if (isLast) {
                window.dispatchEvent(new CustomEvent('navigate', { detail: `candle-detail:${logId}` }));
            } else {
                current++;
                renderStep();
            }
        };
        btns.appendChild(next);
    }

    // Consenti di saltare la guida dalla top-bar (torna al dettaglio)
    window.onTopBackClicked = () => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: `candle-detail:${logId}` }));
    };

    renderStep();
    container.appendChild(wrapper);
}
