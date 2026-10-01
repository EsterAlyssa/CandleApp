// ===================================================
// STOCK.JS - Dettaglio stock di un elemento
// ===================================================

import { createTitle, createButton } from '../components.js?v=3';
import { gramsToMl, formatNum } from '../fragranza.js';

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

    // PONTE API: Fetch singolo elemento per lo stock
    let item = null;
    try {
        const res = await fetch(`/api/inventory?id=${itemId}`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) item = data[0];
        }
    } catch (e) {
        console.warn('[STOCK] Errore di caricamento stock', e);
    }

    if (!item) {
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

    // Status - Logica Percentuale
    const qty = item.quantity_g || 0;
    // Se non c'è una capacità iniziale registrata, assumiamo che fosse uguale alla quantità attuale (evita divisioni per zero)
    const initialQty = item.tech_data?.initial_quantity || qty; 
    
    let percentage = 0;
    if (initialQty > 0) {
        percentage = (qty / initialQty) * 100;
    }

    let status = 'Nuovo';
    let statusIndex = 0;
    
    if (qty <= 0) { 
        status = 'Finita'; 
        statusIndex = 3; 
    } else if (percentage < 30) { 
        status = 'Quasi finito'; 
        statusIndex = 2; 
    } else if (percentage < 100) { 
        status = 'Aperto'; 
        statusIndex = 1; 
    } 
    // Se percentage è 100 (o superiore per qualche ricarica), resta 'Nuovo' (0)

    const statusDiv = document.createElement('div');
    statusDiv.className = 'stock-section';
    const statusTitle = document.createElement('h4');
    // Mostriamo anche la percentuale per comodità visiva
    statusTitle.textContent = `Status (${Math.round(percentage)}%)`; 
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
    // Le essenze si leggono in ml, come sulle boccette
    const qtyText = item.category === 'scent' ? `${formatNum(gramsToMl(qty, item))} ml` : `${qty}g`;
    qtyDiv.innerHTML = `<h4>Quantità disponibile</h4><p class="stock-qty">${qtyText}</p>`;
    wrapper.appendChild(qtyDiv);

    // Back button
    const backBtn = createButton('Torna al magazzino', 'arrow_back', 'btn-primary');
    backBtn.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
    wrapper.appendChild(backBtn);

    container.appendChild(wrapper);
}