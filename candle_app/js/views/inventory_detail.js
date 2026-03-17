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

        if (item.category === 'scent') {
            // Skip intermediate detail view for essences (navigate straight to edit)
            window.dispatchEvent(new CustomEvent('navigate', { detail: `add-essence:Essenze&id=${id}` }));
            return;
        }

        const title = createTitle(item.name, 2);
        wrapper.appendChild(title);

        const html = `
            <p><strong>Categoria:</strong> ${item.category === 'mold' ? 'Stampo' : item.category === 'wax' ? 'Cera' : item.category === 'scent' ? 'Essenza' : item.category}</p>
            <p><strong>Quantità (g):</strong> ${item.quantity_g || '—'}</p>     
            <p><strong>Fornitore:</strong> ${item.supplier || '—'}</p>
            ${item.tech_data && typeof item.tech_data === 'object' ? Object.entries(item.tech_data).map(([k,v]) => {
                let val = v;
                let keyStr = k;
                if(k==='note_type') {
                    keyStr = 'Nota olfattiva';
                    if(v==='base') val = 'di fondo';
                    else if(v==='heart') val = 'di cuore';
                    else if(v==='head') val = 'di testa';
                } else if(k==='melt_temp') {
                    keyStr = 'Temperatura di fusione';
                    val = v + ' °C';
                } else if(k==='density') {
                    keyStr = 'Densità';
                    val = v + ' g/ml';
                } else if(k==='pour_temp') {
                    keyStr = 'Temperatura di versata';
                    val = v + ' °C';
                } else if(k==='max_fragrance') {
                    keyStr = 'Carico max fragranza';
                    val = v + ' %';
                } else if(k==='wax_type') {
                    keyStr = 'Tipo cera';
                } else if(k==='volume_ml') {
                    keyStr = 'Volume (ml)';
                } else if(k==='material') {
                    keyStr = 'Materiale';
                }
                return `<p><strong>${keyStr}:</strong> ${val}</p>`;
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
