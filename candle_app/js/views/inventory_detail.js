// ===================================================
// INVENTORY_DETAIL.JS - Dettaglio elemento inventario
// ===================================================

import { supabase } from '../supabase.js';
import { createButton, createCard, createTitle } from '../components.js?v=3';

export async function renderInventoryDetail(container, id) {
    console.log('[VIEW] Rendering Inventory Detail...', id);
    try {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'inventory-wrapper';

        const { data: item, error } = await supabase.from('inventory').select('*').eq('id', id).single();
        if (error || !item) {
            wrapper.appendChild(createCard('Non trovato', `<p>Elemento non trovato</p>`));
            container.appendChild(wrapper);
            return;
        }

        const title = createTitle(item.name, 2);
        wrapper.appendChild(title);

        const html = `
            <p><strong>Categoria:</strong> ${item.category}</p>
            <p><strong>Quantità (g):</strong> ${item.quantity_g || '—'}</p>
            <p><strong>Fornitore:</strong> ${item.supplier || '—'}</p>
            ${item.tech_data && typeof item.tech_data === 'object' ? Object.entries(item.tech_data).map(([k,v]) => {
                let val = v;
                if(k==='note_type') {
                    if(v==='base') val = 'di fondo';
                    else if(v==='heart') val = 'di cuore';
                    else if(v==='head') val = 'di testa';
                }
                return `<p><strong>${k}:</strong> ${val}</p>`;
            }).join('') : ''}
        `;
        wrapper.appendChild(createCard('Dettagli', html));

        // Buttons: stock, abbinamenti (solo essenze), edit, back
        const btnStock = createButton('Stock', 'inventory', 'btn-primary btn-compact');
        btnStock.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `stock:${id}` }));

        const btnPairings = createButton('Abbinamenti', 'link', 'btn-primary btn-compact');
        btnPairings.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `pairings:${item.family_id || ''}` }));

        // Determine UI category label for edit routing
        const uiCategory = item.category === 'mold' ? 'Stampi' : item.category === 'wax' ? 'Cere' : 'Essenze';
        const btnEdit = createButton('Modifica', 'edit', 'btn-secondary btn-compact');
        btnEdit.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `add-essence:${uiCategory}&id=${id}` }));

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        btnStock.style.flex = '1';
        if(btnEdit) btnEdit.style.flex = '1';
        if(btnPairings) btnPairings.style.flex = '1';
        actions.appendChild(btnStock);
        if (item.category === 'scent') {
            actions.appendChild(btnPairings);
        }
        actions.appendChild(btnEdit);
        wrapper.appendChild(actions);

        container.appendChild(wrapper);
    } catch (e) {
        console.error('[VIEW] renderInventoryDetail error', e);
        container.innerHTML = `<h1>Errore nel caricamento</h1><pre>${e.message || e}</pre>`;
    }
}
