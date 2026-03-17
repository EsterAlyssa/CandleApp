// ===================================================
// CANDLES_BY_ESSENCE.JS - Mostra candele che contengono una certa essenza
// ===================================================

import { supabase } from '../supabase.js';
import { createTitle, createCard, createButton } from '../components.js?v=3';

export async function renderCandlesByEssence(container, essenceId) {
    console.log('[VIEW] Rendering Candles By Essence...', essenceId);
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'dashboard-wrapper';

    const title = createTitle('Candele con questa essenza', 2);
    title.classList.add('page-title');
    wrapper.appendChild(title);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        wrapper.appendChild(createCard('Accesso richiesto', '<p>Effettua il login per vedere le tue candele.</p>'));
        container.appendChild(wrapper);
        return;
    }

    // Find all blends containing this essence
    const { data: blends } = await supabase.from('blends')
        .select('id, name, head_scent_id, heart_scent_id, base_scent_id, resulting_family_id')
        .or(`head_scent_id.eq.${essenceId},heart_scent_id.eq.${essenceId},base_scent_id.eq.${essenceId}`);

    const blendIds = (blends || []).map(b => b.id).filter(Boolean);
    if (blendIds.length === 0) {
        wrapper.appendChild(createCard('Nessuna candela trovata', '<p>Questa essenza non è ancora stata usata in nessuna candela.</p>'));
        container.appendChild(wrapper);
        return;
    }

    const { data: logs, error: logsError } = await supabase.from('candle_log')
        .select('id, created_at, batch_number, mold_id, wax_id, total_wax_used, rating, notes')
        .in('blend_id', blendIds)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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

    // Fetch molds and wax data for display
    const moldIds = Array.from(new Set(logs.map(l => l.mold_id).filter(Boolean)));
    const waxIds = Array.from(new Set(logs.map(l => l.wax_id).filter(Boolean)));

    const [moldResp, waxResp] = await Promise.all([
        moldIds.length > 0 ? supabase.from('inventory').select('id, name, image_url').in('id', moldIds) : { data: [] },
        waxIds.length > 0 ? supabase.from('inventory').select('id, name').in('id', waxIds) : { data: [] }
    ]);

    const moldMap = {};
    (moldResp.data || []).forEach(m => { moldMap[m.id] = m; });
    const waxMap = {};
    (waxResp.data || []).forEach(w => { waxMap[w.id] = w; });

    logs.forEach(log => {
        const mold = moldMap[log.mold_id];
        const wax = waxMap[log.wax_id];

        const card = document.createElement('div');
        card.className = 'dashboard-candle-card';

        const titleText = `Batch ${log.batch_number || ''}`;
        const content = `
            <div class="card-row">
                ${mold?.image_url ? `<img class="card-media" src="${mold.image_url}" alt="${mold.name}" />` : '<div class="card-media placeholder"></div>'}
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
