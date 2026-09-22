// ===================================================
// CANDLE_DETAIL.JS - Dettaglio di una candela salvata
// ===================================================

import { createButton, createTitle, createCard } from '../components.js?v=3';
import { loadBlendScents } from '../blends.js';

export async function renderCandleDetail(container, logId) {
    console.log('[VIEW] Rendering Candle Detail...', logId);
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'dashboard-wrapper';

    const title = createTitle('Dettaglio candela', 2);
    title.classList.add('page-title');
    wrapper.appendChild(title);

    // PONTE 1: Fetch Candle Log
    let log = null;
    try {
        const res = await fetch(`/api/candles?id=${logId}`);
        if (!res.ok) throw new Error('Candela non trovata');
        const data = await res.json();
        log = data[0];
    } catch (e) {
        wrapper.appendChild(createCard('Non trovato', `<p>Non è stato possibile trovare la candela.</p>`));
        container.appendChild(wrapper);
        return;
    }

    // PONTE 2: Fetch relazionali (Inventory e Blends)
    const fetchItem = async (id) => {
        if (!id) return null;
        try {
            const r = await fetch(`/api/inventory?id=${id}`);
            const d = await r.json();
            return d[0] || null;
        } catch(e) { return null; }
    };

    const fetchBlend = async (id) => {
        if (!id) return null;
        try {
            const r = await fetch(`/api/blends?id=${id}`);
            const d = await r.json();
            return d[0] || null;
        } catch(e) { return null; }
    };

    const [mold, wax, blend] = await Promise.all([
        fetchItem(log.mold_id),
        fetchItem(log.wax_id),
        fetchBlend(log.blend_id)
    ]);

    // Carica le essenze del blend
    let scentRows = blend ? await loadBlendScents(blend.id) : [];
    if (scentRows.length === 0 && blend) {
        scentRows = [
            blend.head_scent_id ? { scent_id: blend.head_scent_id, note_type: 'head' } : null,
            blend.heart_scent_id ? { scent_id: blend.heart_scent_id, note_type: 'heart' } : null,
            blend.base_scent_id ? { scent_id: blend.base_scent_id, note_type: 'base' } : null
        ].filter(Boolean);
    }

    // Load names for selected scents
    const scentIds = Array.from(new Set(scentRows.map(r => r.scent_id).filter(Boolean)));
    const scentMap = {};
    if (scentIds.length > 0) {
        // PONTE 3: Fetch in batch per inventory
        try {
            const res = await fetch(`/api/inventory?ids=${scentIds.join(',')}`);
            if (res.ok) {
                const scentsData = await res.json();
                scentsData.forEach(s => { scentMap[s.id] = s.name; });
            }
        } catch(e) { console.warn("Impossibile caricare i nomi delle essenze", e); }
    }

    const namesByNote = (nt) => scentRows
        .filter(r => r.note_type === nt)
        .map(r => scentMap[r.scent_id] || r.scent_id)
        .join(', ');
    const headNames = namesByNote('head');
    const heartNames = namesByNote('heart');
    const baseNames = namesByNote('base');

    let displayNotes = log.notes || '';
    if (displayNotes.includes('Note: ')) {
        displayNotes = displayNotes.split('Note: ').slice(-1)[0];
    } else if (displayNotes.includes('Famiglia: ') && !displayNotes.includes('Note:')) {
        displayNotes = '';
    }

    // Update Helper per API (usato per note e rating)
    const updateLog = async (payload) => {
        try {
            const res = await fetch(`/api/candles`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: log.id, ...payload })
            });
            if (!res.ok) throw new Error('Errore durante l\'aggiornamento');
            return null; // No error
        } catch(e) { return e; }
    };

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
                const err = await updateLog({ rating: newRating });
                if (err) {
                    alert('Errore nel salvataggio del rating: ' + err.message);
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
                ${headNames ? `   <li>Testa: ${headNames}</li>` : ''}
                ${heartNames ? `   <li>Cuore: ${heartNames}</li>` : ''}
                ${baseNames ? `   <li>Fondo: ${baseNames}</li>` : ''}
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
                const err = await updateLog({ notes: notesInput.value });
                if (err) console.error('Errore salvataggio note', err);
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
    btns.style.flexWrap = 'wrap'; 
    btns.style.gap = '8px';

    const editBtn = createButton('Modifica', 'edit', 'btn-secondary btn-compact');
    editBtn.style.flex = '1';
    editBtn.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `lab:logId=${log.id}` }));
    btns.appendChild(editBtn);

    const guideBtn = createButton('Guida colata', 'menu_book', 'btn-secondary btn-compact');
    guideBtn.style.flex = '1';
    guideBtn.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `guide:${log.id}` }));
    btns.appendChild(guideBtn);

    const deleteBtn = createButton('Elimina', 'delete', 'outline-red btn-compact');
    deleteBtn.style.flex = '1';
    deleteBtn.onclick = async () => {
        if (!confirm('Eliminare questa candela?')) return;
        try {
            const res = await fetch(`/api/candles?id=${log.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Errore durante l\'eliminazione');
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
        } catch(err) {
            alert('Errore: ' + err.message);
        }
    };
    btns.appendChild(deleteBtn);

    wrapper.appendChild(btns);
}