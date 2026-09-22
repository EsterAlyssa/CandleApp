// ===================================================
// CANDLES_BY_ESSENCE.JS - Mostra candele che contengono una certa essenza
// ===================================================

import { createTitle, createCard, createButton } from '../components.js?v=3';
import { getImageUrlFromRecord } from '../image.js';

export async function renderCandlesByEssence(container, essenceId) {
    console.log('[VIEW] Rendering Candles By Essence...', essenceId);
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'dashboard-wrapper';

    const title = createTitle('Candele con questa essenza', 2);
    title.classList.add('page-title');
    wrapper.appendChild(title);

    const user = JSON.parse(localStorage.getItem('candle_user') || 'null');
            
    if (!user) {
        wrapper.appendChild(createCard('Accesso richiesto', '<p>Effettua il login per vedere le tue candele.</p>'));
        container.appendChild(wrapper);
        return;
    }

    // PONTE 1: Trova tutti i blend che contengono questa essenza (testa, cuore o fondo)
    let blends = [];
    try {
        const blendRes = await fetch(`/api/blends?essence_id=${essenceId}`);
        if (blendRes.ok) blends = await blendRes.json();
    } catch(e) { console.warn("Errore caricamento blends", e); }

    const blendIds = (blends || []).map(b => b.id).filter(Boolean);
    if (blendIds.length === 0) {
        wrapper.appendChild(createCard('Nessuna candela trovata', '<p>Questa essenza non è ancora stata usata in nessuna candela.</p>'));
        container.appendChild(wrapper);
        return;
    }

    // PONTE 2: Trova tutti i log delle candele associate a questi blend
    let logs = [];
    let logsError = null;
    try {
        const logsRes = await fetch(`/api/candles?blend_ids=${blendIds.join(',')}&user_id=${user.id}`);
        if (!logsRes.ok) throw new Error('Errore durante il caricamento delle candele');
        logs = await logsRes.json();
    } catch (e) {
        logsError = e;
    }

    if (logsError) {
        wrapper.appendChild(createCard('Errore', `<p>${logsError.message}</p>`));
        container.appendChild(wrapper);
        return;
    }

    if (!logs || logs.length === 0) {
        wrapper.appendChild(createCard('Nessuna candela trovata', '<p>Non hai ancora creato candele con questa essenza.</p>'));
        container.appendChild(wrapper);
        return;
    }

    // PONTE 3 & 4: Fetch molds e wax data in batch
    const moldIds = Array.from(new Set(logs.map(l => l.mold_id).filter(Boolean)));
    const waxIds = Array.from(new Set(logs.map(l => l.wax_id).filter(Boolean)));

    const fetchItems = async (ids) => {
        if (!ids || ids.length === 0) return [];
        try {
            const res = await fetch(`/api/inventory?ids=${ids.join(',')}`);
            if (!res.ok) return [];
            return await res.json();
        } catch(e) { return []; }
    };

    const [moldData, waxData] = await Promise.all([
        fetchItems(moldIds),
        fetchItems(waxIds)
    ]);

    const moldMap = {};
    moldData.forEach(m => { moldMap[m.id] = m; });
    const waxMap = {};
    waxData.forEach(w => { waxMap[w.id] = w; });

    logs.forEach(log => {
        const mold = moldMap[log.mold_id];
        const wax = waxMap[log.wax_id];

        const card = document.createElement('div');
        card.className = 'dashboard-candle-card';

        const titleText = `Batch ${log.batch_number || ''}`;
        const moldImageUrl = getImageUrlFromRecord(mold);
        const content = `
            <div class="card-row">
                ${moldImageUrl ? `<img class="card-media" src="${moldImageUrl}" alt="${mold?.name || ''}" />` : '<div class="card-media placeholder" style="display: flex; align-items: center; justify-content: center; background-color: var(--surface-variant);"><span class="material-symbols-outlined" style="font-size: 2rem; color: var(--on-surface-variant);">view_in_ar</span></div>'}
                <div class="card-body">
                    <div class="card-meta">${new Date(log.created_at).toLocaleDateString('it-IT')}</div>
                    <p class="card-desc"><strong>Stampo:</strong> ${mold?.name || '—'}</p>
                    <p class="card-desc"><strong>Cera:</strong> ${wax?.name || '—'}</p>
                    <p class="card-drops"><strong>Gocce totali:</strong> ${log.total_wax_used != null ? log.total_wax_used : '—'} g</p>
                    <p class="dashboard-notes">${log.notes ? String(log.notes).replace(/</g,'&lt;') : ''}</p>
                </div>
            </div>
            <div class="dashboard-rating">${'★'.repeat(log.rating || 0)}${'☆'.repeat(5 - (log.rating || 0))}</div>
        `;

        const btnInfo = createButton('Info', 'info', 'btn-card-edit');
        btnInfo.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `candle-detail:${log.id}` }));
        const btnEdit = createButton('Modifica', 'edit', 'btn-card-edit');
        btnEdit.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `lab:logId=${log.id}` }));

        const cardEl = createCard(titleText, content, [btnInfo, btnEdit]);
        cardEl.classList.add('dashboard-candle-card');
        wrapper.appendChild(cardEl);
    });

    container.appendChild(wrapper);
}