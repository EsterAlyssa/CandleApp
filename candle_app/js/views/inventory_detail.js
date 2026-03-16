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
            ${item.tech_data ? '<pre>' + JSON.stringify(item.tech_data, null, 2) + '</pre>' : ''}
        `;
        wrapper.appendChild(createCard('Dettagli', html));

        // Buttons: stock, edit, back
        const btnStock = createButton('Stock', 'inventory', 'btn-primary btn-compact');
        btnStock.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `stock:${id}` }));
        const btnPairings = createButton('Abbinamenti', 'link', 'btn-primary btn-compact');
        btnPairings.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `pairings:${item.family_id || ''}` }));
        const btnEdit = createButton('Modifica', 'edit', 'btn-card-edit');
        btnEdit.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `lab` }));

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.appendChild(btnStock);
        actions.appendChild(btnPairings);
        actions.appendChild(btnEdit);
        wrapper.appendChild(actions);

        container.appendChild(wrapper);
    } catch (e) {
        console.error('[VIEW] renderInventoryDetail error', e);
        container.innerHTML = `<h1>Errore nel caricamento</h1><pre>${e.message || e}</pre>`;
    }
}
