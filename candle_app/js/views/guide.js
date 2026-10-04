// ===================================================
// GUIDE.JS - Guida di colata passo-passo
// Parte dopo la creazione di una nuova candela e accompagna
// la preparazione usando i dati della ricetta appena salvata.
// ===================================================

import { createButton, createTitle } from '../components.js?v=3';
import { loadBlendScents } from '../blends.js';
import { waxGrams, fragranceGrams, splitFragrance, fragranceTotalHtml, doseListHtml } from '../fragranza.js';

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

    // PONTE 1: Carica la candela
    let log = null;
    try {
        const res = await fetch(`/api/candles?id=${logId}`);
        if (!res.ok) throw new Error('Candela non trovata');
        const data = await res.json();
        log = data[0];
    } catch (e) {
        wrapper.innerHTML = '<p class="error-text">Impossibile caricare la candela.</p>';
        container.appendChild(wrapper);
        return;
    }

    if (!log) {
        wrapper.innerHTML = '<p class="error-text">Impossibile caricare la candela.</p>';
        container.appendChild(wrapper);
        return;
    }

    // PONTE 2, 3, 4: Carica stampo, cera, blend
    const fetchItem = async (endpoint, id) => {
        if (!id) return null;
        try {
            const r = await fetch(`/api/${endpoint}?id=${id}`);
            const d = await r.json();
            return d[0] || null;
        } catch(e) { return null; }
    };

    const [mold, wax, blend] = await Promise.all([
        fetchItem('inventory', log.mold_id),
        fetchItem('inventory', log.wax_id),
        fetchItem('blends', log.blend_id)
    ]);

    // --- Essenze del blend (tabella ponte, fallback colonne singole) ---
    let scentRows = blend ? await loadBlendScents(blend.id) : [];
    if (scentRows.length === 0 && blend) {
        scentRows = [
            blend.head_scent_id ? { scent_id: blend.head_scent_id, note_type: 'head' } : null,
            blend.heart_scent_id ? { scent_id: blend.heart_scent_id, note_type: 'heart' } : null,
            blend.base_scent_id ? { scent_id: blend.base_scent_id, note_type: 'base' } : null
        ].filter(Boolean);
    }
    
    // PONTE 5: Nomi delle essenze
    const scentIds = Array.from(new Set(scentRows.map(r => r.scent_id).filter(Boolean)));
    const scentsById = {};
    if (scentIds.length > 0) {
        try {
            const res = await fetch(`/api/inventory?ids=${scentIds.join(',')}`);
            if (res.ok) {
                const scentsData = await res.json();
                scentsData.forEach(s => { scentsById[s.id] = s; });
            }
        } catch(e) { console.warn("Impossibile caricare le essenze", e); }
    }

    // --- Calcolo quantità (stessa formula del wizard, da fragranza.js) ---
    const cap = mold?.quantity_g || 100;
    const fragPct = typeof log.fragrance_load_percent === 'number' ? log.fragrance_load_percent : 8;
    const effectiveWax = log.total_wax_used || waxGrams(mold, wax);
    const fragG = fragranceGrams(effectiveWax, fragPct);

    const meltTemp = wax?.tech_data?.melt_temp;
    const pourTemp = wax?.tech_data?.pour_temp;

    // --- Ripartizione fragranza per nota, in gocce ---
    const doseLines = splitFragrance(fragG, scentRows.map(r => ({
        id: r.scent_id,
        name: scentsById[r.scent_id]?.name || r.scent_id,
        note_type: r.note_type
    })), scentsById);
    const fragText = fragranceTotalHtml(fragG, doseLines, fragPct);

    // --- Definizione degli step ---
    const li = (arr) => `<ul class="guide-list">${arr.map(x => `<li>${x}</li>`).join('')}</ul>`;
    const steps = [
        {
            icon: 'checklist',
            title: 'Occorrente',
            body: `
                <p>Prepara tutto il necessario per <strong>la candela</strong>${blend?.name ? ` — <em>${blend.name}</em>` : ''}.</p>
                ${li([
                    `Stampo: <strong>${mold?.name || '—'}</strong> (capacità ${cap} g)`,
                    `Cera: <strong>${wax?.name || '—'}</strong> — <strong>${effectiveWax} g</strong>`,
                    `Fragranza: ${fragText}`,
                    `Le boccette delle essenze con il loro contagocce`,
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
                <p>${pourTemp ? `Lascia intiepidire la cera fino a circa <strong>${pourTemp} °C</strong>, poi aggiungi` : 'Quando la cera si è leggermente raffreddata, aggiungi'} ${doseLines.length > 0 ? 'le essenze contando le gocce' : `<strong>${Math.round(fragG)} g</strong> di fragranza`} e mescola con cura per 1-2 minuti.</p>
                ${doseLines.length > 0 ? `<p class="guide-sub">Gocce per essenza:</p>${doseListHtml(doseLines, 'guide-list dose-list')}` : ''}
                ${doseLines.length > 0 ? `<p class="guide-note">Tieni la boccetta in verticale e lascia cadere le gocce una alla volta, così escono più regolari.</p>` : ''}
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

    window.onTopBackClicked = () => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: `candle-detail:${logId}` }));
    };

    renderStep();
    container.appendChild(wrapper);
}