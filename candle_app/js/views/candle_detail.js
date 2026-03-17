// ===================================================
// CANDLE_DETAIL.JS - Dettaglio di una candela salvata
// ===================================================

import { supabase } from '../supabase.js';
import { createButton, createTitle, createCard } from '../components.js?v=3';

export async function renderCandleDetail(container, logId) {
    console.log('[VIEW] Rendering Candle Detail...', logId);
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'dashboard-wrapper';

    const title = createTitle('Dettaglio candela', 2);
    title.classList.add('page-title');
    wrapper.appendChild(title);

    const { data: log, error: logError } = await supabase.from('candle_log').select('*').eq('id', logId).single();
    if (logError || !log) {
        wrapper.appendChild(createCard('Non trovato', `<p>Non è stato possibile trovare la candela.</p>`));
        container.appendChild(wrapper);
        return;
    }

    const [moldResp, waxResp, blendResp] = await Promise.all([
        log.mold_id ? supabase.from('inventory').select('id, name, image_url').eq('id', log.mold_id).maybeSingle() : { data: null, error: null },
        log.wax_id ? supabase.from('inventory').select('id, name').eq('id', log.wax_id).maybeSingle() : { data: null, error: null },
        log.blend_id ? supabase.from('blends').select('id, name, head_scent_id, heart_scent_id, base_scent_id, resulting_family_id').eq('id', log.blend_id).maybeSingle() : { data: null, error: null }
    ]);

    const mold = moldResp.data;
    const wax = waxResp.data;
    const blend = blendResp.data;

    // Load names for selected scents
    const scentIds = [blend?.head_scent_id, blend?.heart_scent_id, blend?.base_scent_id].filter(Boolean);
    const scentsResp = await (scentIds.length > 0 ? supabase.from('inventory').select('id, name').in('id', scentIds) : { data: [] });
    const scentMap = {};
    (scentsResp.data || []).forEach(s => { scentMap[s.id] = s.name; });

    const cardHtml = `
        <p><strong>Batch:</strong> ${log.batch_number || '—'}</p>
        <p><strong>Data:</strong> ${new Date(log.created_at).toLocaleString('it-IT')}</p>
        <p><strong>Stampo:</strong> ${mold?.name || '—'}</p>
        <p><strong>Cera:</strong> ${wax?.name || '—'}</p>
        <p><strong>Carico fragranza:</strong> ${log.fragrance_load_percent ?? '—'}%</p>
        <p><strong>Fragranza:</strong> ${blend?.name || '—'}</p>
        <p><strong>Note:</strong> ${log.notes || '—'}</p>
        <p><strong>Rating:</strong> ${'★'.repeat(log.rating || 0)}${'☆'.repeat(5 - (log.rating || 0))}</p>
        ${blend ? `
            <p><strong>Note selezionate:</strong></p>
            <ul>
                ${blend.head_scent_id ? `\t<li>Testa: ${scentMap[blend.head_scent_id] || blend.head_scent_id}</li>` : ''}
                ${blend.heart_scent_id ? `\t<li>Cuore: ${scentMap[blend.heart_scent_id] || blend.heart_scent_id}</li>` : ''}
                ${blend.base_scent_id ? `\t<li>Fondo: ${scentMap[blend.base_scent_id] || blend.base_scent_id}</li>` : ''}
            </ul>
        ` : ''}
    `;

    wrapper.appendChild(createCard('Dettagli candela', cardHtml));

    const btns = document.createElement('div');
    btns.className = 'btn-container';

    const editBtn = createButton('Modifica', 'edit', 'btn-primary');
    editBtn.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `lab:logId=${log.id}` }));
    btns.appendChild(editBtn);

    const deleteBtn = createButton('Elimina', 'delete', 'btn-secondary');
    deleteBtn.onclick = async () => {
        if (!confirm('Eliminare questa candela?')) return;
        const { error } = await supabase.from('candle_log').delete().eq('id', log.id);
        if (error) alert('Errore: ' + error.message);
        else window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
    };
    btns.appendChild(deleteBtn);

    wrapper.appendChild(btns);
    container.appendChild(wrapper);
}
