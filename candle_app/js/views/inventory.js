// ===================================================
// INVENTORY.JS - Gestione Magazzino (con 3 tab)
// ===================================================

import { supabase } from '../supabase.js';
import { createButton, createTitle } from '../components.js?v=3';

export async function renderInventory(container) {
    console.log('[VIEW] Rendering Inventory...');
    try {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'inventory-wrapper';

        const title = createTitle('Magazzino', 2);
        title.classList.add('page-title');
        wrapper.appendChild(title);

        // Tabs: Cere, Stampi, Essenze
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'tabs-container';

        const tabs = [
            { id: 'Cere', label: 'Cere' },
            { id: 'Stampi', label: 'Stampi' },
            { id: 'Essenze', label: 'Essenze' }
        ];

        // Map UI categories to DB categories
        const categoryMap = {
            'Cere': 'wax',
            'Stampi': 'mold',
            'Essenze': 'scent'
        };

        let activeTab = 'Cere';

        tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn' + (tab.id === activeTab ? ' active' : '');
            btn.textContent = tab.label;
            btn.onclick = async () => {
                activeTab = tab.id;
                tabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                await loadList(tab.id);
            };
            tabsContainer.appendChild(btn);
        });
        wrapper.appendChild(tabsContainer);

        // Add button
        const addBtn = createButton('Aggiungi un elemento', 'add', 'btn-primary');
        addBtn.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `add-essence:${activeTab}` }));
        wrapper.appendChild(addBtn);

        // Content
        const listContainer = document.createElement('div');
        listContainer.className = 'items-container';
        wrapper.appendChild(listContainer);

        // Determine current user (to scope inventory)
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        // Families cache for essences
        let familiesMap = {};
        const { data: famData } = await supabase.from('families').select('id, name_it');
        (famData || []).forEach(f => { familiesMap[f.id] = f.name_it || ''; });

        async function loadList(category) {
            listContainer.innerHTML = '';
            // Adjust grid for category
            if (category === 'Stampi') {
                listContainer.className = 'items-container items-grid';
            } else {
                listContainer.className = 'items-container items-list';
            }

            const dbCategory = categoryMap[category] || category;
            let query = supabase.from('inventory').select('*').eq('category', dbCategory);
            if (userId) query = query.eq('user_id', userId);
            const { data, error } = await query.order('name');

            if (error) {
                listContainer.innerHTML = `<p class="error-text">Errore: ${error.message}</p>`;
                return;
            }
            if (!data || data.length === 0) {
                listContainer.innerHTML = '<p class="empty-text">Nessun elemento in questa categoria.</p>';
                return;
            }

            if (category === 'Cere') renderWaxList(data);
            else if (category === 'Stampi') renderMoldGrid(data);
            else if (category === 'Essenze') renderEssenceList(data);
        }

        // ===== CERE: simple list =====
        function renderWaxList(items) {
            const heading = document.createElement('h3');
            heading.className = 'inv-section-title';
            heading.textContent = 'Cere presenti';
            listContainer.appendChild(heading);

            items.forEach(item => {
                const row = document.createElement('div');
                row.className = 'wax-row';
                const bullet = document.createElement('span');
                bullet.className = 'wax-bullet';
                bullet.textContent = '•';
                const name = document.createElement('span');
                name.className = 'wax-name';
                name.textContent = item.name;
                const qty = document.createElement('span');
                qty.className = 'wax-qty';
                qty.textContent = formatQty(item.quantity_g);
                const useBtn = createButton('Usa', 'add_circle', 'btn-secondary btn-mini');
                useBtn.onclick = (e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('navigate', { detail: `lab:wax=${item.id}` }));
                };
                row.appendChild(bullet);
                row.appendChild(name);
                row.appendChild(qty);
                row.appendChild(useBtn);
                row.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `inventory-detail:${item.id}` }));
                listContainer.appendChild(row);
            });
        }

        // ===== STAMPI: card grid with images =====
        function renderMoldGrid(items) {
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'item-card mold-card';
                const img = document.createElement('img');
                img.className = 'mold-image';
                img.src = item.image_url || '/assets/placeholder.png';
                img.alt = item.name;
                card.appendChild(img);

                const nameEl = document.createElement('h3');
                nameEl.textContent = item.name;
                card.appendChild(nameEl);

                const meta = document.createElement('p');
                meta.textContent = `Capacità: ${item.quantity_g || '—'}g`;
                card.appendChild(meta);

                const btnUse = createButton('Usa', 'add_circle', 'btn-secondary btn-mini');
                btnUse.onclick = (e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('navigate', { detail: `lab:mold=${item.id}` }));
                };
                card.appendChild(btnUse);

                card.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `inventory-detail:${item.id}` }));
                listContainer.appendChild(card);
            });
        }

        // ===== ESSENZE: detailed cards =====
        function renderEssenceList(items) {
            const heading = document.createElement('h3');
            heading.className = 'inv-section-title';
            heading.textContent = 'Essenze disponibili';
            listContainer.appendChild(heading);

            const filterBar = document.createElement('div');
            filterBar.className = 'lab-filter-bar';

            const familyFilter = document.createElement('select');
            familyFilter.className = 'lab-filter-select';
            const famOpt0 = document.createElement('option');
            famOpt0.value = '';
            famOpt0.textContent = 'Tutte le famiglie';
            familyFilter.appendChild(famOpt0);
            const familyIds = Array.from(new Set(items.map(i => i.family_id).filter(Boolean)));
            familyIds.forEach(fid => {
                const opt = document.createElement('option');
                opt.value = fid;
                opt.textContent = familiesMap[fid] || fid;
                familyFilter.appendChild(opt);
            });

            const noteFilter = document.createElement('select');
            noteFilter.className = 'lab-filter-select';
            const noteOpt0 = document.createElement('option');
            noteOpt0.value = '';
            noteOpt0.textContent = 'Tutte le note';
            noteFilter.appendChild(noteOpt0);
            const noteTypes = Array.from(new Set(items.map(i => i.tech_data?.note_type).filter(Boolean)));
            noteTypes.forEach(nt => {
                const opt = document.createElement('option');
                opt.value = nt;
                opt.textContent = nt;
                noteFilter.appendChild(opt);
            });

            filterBar.appendChild(familyFilter);
            filterBar.appendChild(noteFilter);
            listContainer.appendChild(filterBar);

            const renderFiltered = () => {
                // remove existing cards
                listContainer.querySelectorAll('.essence-card').forEach(c => c.remove());
                const familyVal = familyFilter.value;
                const noteVal = noteFilter.value;

                items.forEach(item => {
                    const noteType = item.tech_data?.note_type || '';
                    if (familyVal && item.family_id !== familyVal) return;
                    if (noteVal && noteType !== noteVal) return;

                    const card = document.createElement('div');
                    card.className = 'essence-card';

                    const nameEl = document.createElement('div');
                    nameEl.className = 'essence-name';
                    nameEl.textContent = item.name;
                    if (item.quantity_g >= 10) {
                        const badge = document.createElement('span');
                        badge.className = 'essence-new-badge';
                        badge.textContent = 'Nuovo';
                        nameEl.appendChild(badge);
                    }
                    card.appendChild(nameEl);

                    const famName = item.family_id ? (familiesMap[item.family_id] || '') : '';
                    if (famName) {
                        const famEl = document.createElement('div');
                        famEl.className = 'essence-meta';
                        famEl.textContent = `Famiglia: ${famName}`;
                        card.appendChild(famEl);
                    }

                    if (noteType) {
                        const noteEl = document.createElement('div');
                        noteEl.className = 'essence-meta';
                        noteEl.textContent = `Nota: ${noteType}`;
                        card.appendChild(noteEl);
                    }

                    // Star rating
                    const rating = item.tech_data?.rating || 0;
                    const starsEl = document.createElement('div');
                    starsEl.className = 'essence-stars';
                    starsEl.textContent = '★'.repeat(rating) + '☆'.repeat(5 - rating);
                    card.appendChild(starsEl);

                    // Action buttons
                    const actions = document.createElement('div');
                    actions.className = 'essence-actions';

                    const btnUse = createButton('Usa', 'add_circle', 'btn-primary btn-mini');
                    btnUse.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: `lab:ess=${item.id}` })); };

                    const btnAbb = document.createElement('button');
                    btnAbb.className = 'btn btn-card-edit';
                    btnAbb.innerHTML = '<span class="material-symbols-outlined btn-icon">link</span><span class="btn-label">Abbinamenti</span>';
                    btnAbb.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: `pairings:${item.family_id || item.id}` })); };

                    const btnStock = document.createElement('button');
                    btnStock.className = 'btn btn-card-edit';
                    btnStock.innerHTML = '<span class="material-symbols-outlined btn-icon">inventory</span><span class="btn-label">Stock</span>';
                    btnStock.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: `stock:${item.id}` })); };

                    const btnEdit = document.createElement('button');
                    btnEdit.className = 'btn btn-card-edit';
                    btnEdit.innerHTML = '<span class="material-symbols-outlined btn-icon">edit</span><span class="btn-label">Modifica</span>';
                    btnEdit.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: `inventory-detail:${item.id}` })); };

                    const btnDelete = document.createElement('button');
                    btnDelete.className = 'btn btn-card-delete';
                    btnDelete.innerHTML = '<span class="material-symbols-outlined btn-icon">delete</span><span class="btn-label">Elimina</span>';
                    btnDelete.onclick = async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Eliminare "${item.name}"?`)) return;
                        const { error } = await supabase.from('inventory').delete().eq('id', item.id);
                        if (error) alert('Errore: ' + error.message);
                        else loadList(activeTab);
                    };

                    actions.appendChild(btnUse);
                    actions.appendChild(btnAbb);
                    actions.appendChild(btnStock);
                    actions.appendChild(btnEdit);
                    actions.appendChild(btnDelete);
                    card.appendChild(actions);

                    card.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `inventory-detail:${item.id}` }));
                    listContainer.appendChild(card);
                });
            };

            familyFilter.onchange = renderFiltered;
            noteFilter.onchange = renderFiltered;

            renderFiltered();
        }

        function formatQty(g) {
            if (!g && g !== 0) return '—';
            if (g >= 1000) return `${(g / 1000).toFixed(g % 1000 === 0 ? 0 : 1)} kg`;
            return `${g} g`;
        }

        // Initial load
        await loadList(activeTab);

        container.appendChild(wrapper);
    } catch (e) {
        console.error('[VIEW] renderInventory error', e);
        container.innerHTML = `<h1>Errore nel caricamento</h1><pre>${e.message || e}</pre>`;
    }
}
