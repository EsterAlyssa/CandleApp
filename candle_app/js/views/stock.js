// ===================================================
// STOCK.JS - Dettaglio stock di un elemento
// ===================================================

import { supabase } from '../supabase.js';
import { createTitle, createButton } from '../components.js?v=3';

export async function renderStock(container, itemId) {
    console.log('[VIEW] Rendering Stock for', itemId);
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'inventory-wrapper';

    if (!itemId) {
        wrapper.innerHTML = '<p>Nessun elemento selezionato.</p>';
        container.appendChild(wrapper);
        return;
    }

    const { data: item, error } = await supabase.from('inventory').select('id, user_id, name, category, quantity_g, supplier, family_id, tech_data, image_ref').eq('id', itemId).maybeSingle();
    if (error || !item) {
        wrapper.innerHTML = '<p>Elemento non trovato.</p>';
        container.appendChild(wrapper);
        return;
    }

    const title = createTitle('Stock', 2);
    title.classList.add('page-title');
    wrapper.appendChild(title);

    // Essence name
    const nameEl = document.createElement('h3');
    nameEl.className = 'stock-item-name';
    nameEl.textContent = `${item.category === 'Essenze' ? 'Essenza' : item.category}: ${item.name}`;
    wrapper.appendChild(nameEl);

    // Supplier
    const supplierDiv = document.createElement('div');
    supplierDiv.className = 'stock-section';
    supplierDiv.innerHTML = `
        <h4>Venditore</h4>
        <p>${item.supplier || '—'}</p>
    `;
    wrapper.appendChild(supplierDiv);

    // Status
    const qty = item.quantity_g || 0;
    let status = 'Nuovo';
    let statusIndex = 0;
    if (qty <= 0) { status = 'Finita'; statusIndex = 3; }
    else if (qty < 100) { status = 'Quasi finito'; statusIndex = 2; }
    else if (qty < 500) { status = 'Aperto'; statusIndex = 1; }

    const statusDiv = document.createElement('div');
    statusDiv.className = 'stock-section';
    const statusTitle = document.createElement('h4');
    statusTitle.textContent = 'Status';
    statusDiv.appendChild(statusTitle);

    const statuses = ['Nuovo', 'Aperto', 'Quasi finito', 'Finita'];
    const statusColors = ['badge-new', 'badge-opened', 'badge-warning', 'badge-finished'];
    const statusList = document.createElement('div');
    statusList.className = 'stock-status-list';
    statuses.forEach((s, i) => {
        const badge = document.createElement('span');
        badge.className = `status-badge ${statusColors[i]}${i === statusIndex ? ' active-status' : ''}`;
        badge.textContent = s;
        statusList.appendChild(badge);
    });
    statusDiv.appendChild(statusList);
    wrapper.appendChild(statusDiv);

    // Quantity detail
    const qtyDiv = document.createElement('div');
    qtyDiv.className = 'stock-section';
    qtyDiv.innerHTML = `<h4>Quantità disponibile</h4><p class="stock-qty">${qty}g</p>`;
    wrapper.appendChild(qtyDiv);

    // Back button
    const backBtn = createButton('Torna al magazzino', 'arrow_back', 'btn-primary');
    backBtn.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
    wrapper.appendChild(backBtn);

    container.appendChild(wrapper);
}
