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
        log.mold_id ? supabase.from('inventory').select('id, name, image_ref').eq('id', log.mold_id).maybeSingle() : { data: null, error: null },
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

    let displayNotes = log.notes || '';
    if (displayNotes.includes('Note: ')) {
        displayNotes = displayNotes.split('Note: ').slice(-1)[0];
    } else if (displayNotes.includes('Famiglia: ') && !displayNotes.includes('Note:')) {
        // If it only had frag/family but no notes
        displayNotes = '';
    }

    const renderRatingStars = (value) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'essence-stars';

        for (let i = 1; i <= 5; i += 1) {
            const star = document.createElement('span');
            star.className = 'essence-star' + (i <= value ? ' filled' : '');
            star.textContent = '★';
            star.title = `${i} / 5`;
            star.style.cursor = 'pointer';
            star.onclick = async () => {
                const newRating = i;
                const { error } = await supabase.from('candle_log').update({ rating: newRating }).eq('id', log.id);
                if (error) {
                    alert('Errore nel salvataggio del rating: ' + error.message);
                    return;
                }
                wrapper.replaceWith(renderRatingStars(newRating));
            };
            wrapper.appendChild(star);
        }

        return wrapper;
    };

    const cardHtml = `
        <p><strong>Batch:</strong> ${log.batch_number || '—'}</p>
        <p><strong>Data:</strong> ${new Date(log.created_at).toLocaleString('it-IT')}</p>
        <p><strong>Stampo:</strong> ${mold?.name || '—'}</p>
        <p><strong>Cera:</strong> ${wax?.name || '—'}</p>
        <p><strong>Carico fragranza:</strong> ${log.fragrance_load_percent ?? '—'}%</p>
        <p><strong>Fragranza:</strong> ${blend?.name || '—'}</p>
        <div id="notes-container" style="margin-top: 8px;">
            <p style="margin-bottom: 4px;"><strong>Note:</strong></p>
            <textarea id="candle-notes" class="input-field" rows="3" placeholder="Aggiungi una nota...">${displayNotes}</textarea>
        </div>
        <div id="rating-stars" style="margin-top: 12px;"></div>
        ${blend ? `
            <p><strong>Note selezionate:</strong></p>
            <ul>
                ${blend.head_scent_id ? `   <li>Testa: ${scentMap[blend.head_scent_id] || blend.head_scent_id}</li>` : ''}
                ${blend.heart_scent_id ? `   <li>Cuore: ${scentMap[blend.heart_scent_id] || blend.heart_scent_id}</li>` : ''}
                ${blend.base_scent_id ? `   <li>Fondo: ${scentMap[blend.base_scent_id] || blend.base_scent_id}</li>` : ''}
            </ul>
        ` : ''}
    `;

    const detailsCard = createCard('Dettagli candela', cardHtml);
    
    // Setup notes auto-save
    const notesInput = detailsCard.querySelector('#candle-notes');
    if (notesInput) {
        let timeout;
        notesInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const { error } = await supabase.from('candle_log').update({ notes: notesInput.value }).eq('id', log.id);
                if (error) console.error('Errore salvataggio note', error);
            }, 1000);
        });
    }

    const ratingContainer = detailsCard.querySelector('#rating-stars');
    if (ratingContainer) {
        ratingContainer.replaceWith(renderRatingStars(log.rating || 0));
    }
    wrapper.appendChild(detailsCard);

    const btns = document.createElement('div');
    btns.className = 'btn-container';
    btns.style.display = 'flex';
    btns.style.gap = '8px';

    const editBtn = createButton('Modifica', 'edit', 'btn-secondary');
    editBtn.style.flex = '1';
    editBtn.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `lab:logId=${log.id}` }));
    btns.appendChild(editBtn);

    const deleteBtn = createButton('Elimina', 'delete', 'btn-primary');
    deleteBtn.style.flex = '1';
    deleteBtn.style.setProperty('--md-sys-color-primary', 'var(--md-sys-color-error, #b3261e)');
    deleteBtn.style.setProperty('--md-sys-color-on-primary', 'var(--md-sys-color-on-error, #ffffff)');
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
