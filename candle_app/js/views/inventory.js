// ===================================================
// INVENTORY.JS - Gestione Magazzino (con 3 tab)
// ===================================================

import { supabase } from '../supabase.js';
import { createButton, createTitle } from '../components.js?v=3';
import { getImageUrlFromRecord } from '../image.js';

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
            { id: 'Essenze', label: 'Essenze' },
            { id: 'Fragranze', label: 'Mix usati' },
            { id: 'Candele', label: 'Candele' }
        ];

        // Map UI categories to DB categories
        const categoryMap = {
            'Cere': 'wax',
            'Stampi': 'mold',
            'Essenze': 'scent'
        };

        let activeTab = sessionStorage.getItem('inventoryActiveTab') || 'Cere';

        tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn' + (tab.id === activeTab ? ' active' : '');
            btn.textContent = tab.label;
            btn.onclick = async () => {
                activeTab = tab.id; sessionStorage.setItem('inventoryActiveTab', tab.id);
                tabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                await loadList(tab.id);
            };
            tabsContainer.appendChild(btn);
        });
        wrapper.appendChild(tabsContainer);

        // Add button
        const addBtn = createButton('Aggiungi un elemento', 'add', 'btn-primary');
        addBtn.onclick = () => {
            if (activeTab === 'Candele' || activeTab === 'Fragranze') {
                window.dispatchEvent(new CustomEvent('navigate', { detail: 'lab' }));
            } else {
                window.dispatchEvent(new CustomEvent('navigate', { detail: `add-essence:${activeTab}` }));
            }
        };
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

            let data, error;
            if (category === 'Fragranze') {
                const res = await supabase.from('blends').select('*').eq('user_id', userId).order('name');
                data = res.data; error = res.error;
            } else if (category === 'Candele') {
                const res = await supabase.from('candle_log').select('*, blends(name, resulting_family_id)').eq('user_id', userId).order('created_at', { ascending: false });
                data = res.data; error = res.error;
            } else {
                const dbCategory = categoryMap[category] || category;
                let query = supabase.from('inventory').select('*').eq('category', dbCategory);
                if (userId) query = query.eq('user_id', userId);
                const res = await query.order('name');
                data = res.data; error = res.error;
            }

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
            else if (category === 'Fragranze') renderFragranzeList(data);
            else if (category === 'Candele') renderCandeleList(data);
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
                
                
                
                const name = document.createElement('span');
                name.className = 'wax-name';
                name.textContent = item.name;
                const qty = document.createElement('span');
                qty.className = 'wax-qty';
                qty.textContent = formatQty(item.quantity_g);
                
                row.appendChild(name);
                row.appendChild(qty);
                
                row.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `inventory-detail:${item.id}` }));
                listContainer.appendChild(row);
            });
        }

        // ===== STAMPI: card grid with images =====
        function renderMoldGrid(items) {
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'item-card mold-card';
                
                const imageUrl = getImageUrlFromRecord(item);
                if (imageUrl) {
                    const img = document.createElement('img');
                    img.className = 'mold-image';
                    img.src = imageUrl;
                    img.alt = item.name;
                    card.appendChild(img);
                } else {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'lab-card-img placeholder';
                    placeholder.style.margin = '0 auto';
                    placeholder.innerHTML = '<span class="material-symbols-outlined">view_in_ar</span>';
                    card.appendChild(placeholder);
                }

                const nameEl = document.createElement('h3');
                nameEl.textContent = item.name;
                card.appendChild(nameEl);

                const meta = document.createElement('p');
                meta.textContent = `Capacità: ${item.quantity_g || '—'}g`;
                card.appendChild(meta);

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
                let displayNt = nt;
                if(nt === 'base') displayNt = 'di fondo';
                if(nt === 'heart') displayNt = 'di cuore';
                if(nt === 'head') displayNt = 'di testa';
                opt.textContent = displayNt;
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

                    let displayNoteType = noteType;
                    if(noteType === 'base') displayNoteType = 'di fondo';
                    if(noteType === 'heart') displayNoteType = 'di cuore';
                    if(noteType === 'head') displayNoteType = 'di testa';

                    const card = document.createElement('div');
                    card.className = 'essence-card fluid-essence-card';

                    const topSection = document.createElement('div');
                    topSection.className = 'essence-top-section';

                    const infoCol = document.createElement('div');
                    infoCol.className = 'essence-info-col';

                    const nameEl = document.createElement('div');
                    nameEl.className = 'essence-name';
                    nameEl.textContent = item.name;
                    if (item.quantity_g >= 10) {
                        const badge = document.createElement('span');
                        badge.className = 'essence-new-badge';
                        badge.textContent = 'Nuovo';
                        nameEl.appendChild(badge);
                    }
                    infoCol.appendChild(nameEl);

                    const famName = item.family_id ? (familiesMap[item.family_id] || '') : '';
                    if (famName) {
                        const famEl = document.createElement('div');
                        famEl.className = 'essence-meta';
                        famEl.textContent = `Famiglia: ${famName}`;
                        infoCol.appendChild(famEl);
                    }

                    if (noteType) {
                        const noteEl = document.createElement('div');
                        noteEl.className = 'essence-meta';
                        noteEl.textContent = `Nota: ${displayNoteType}`;
                        infoCol.appendChild(noteEl);
                    }

                    // Star rating (click to set)
                    const rating = item.tech_data?.rating || 0;
                    const starsEl = document.createElement('div');
                    starsEl.className = 'essence-stars';

                    const renderStars = (value) => {
                        starsEl.innerHTML = '';
                        for (let i = 1; i <= 5; i += 1) {
                            const star = document.createElement('span');
                            star.className = 'essence-star' + (i <= value ? ' filled' : '');
                            star.textContent = '★';
                            star.style.cursor = 'pointer';
                            star.title = `${i} / 5`;
                            star.onclick = async (e) => {
                                e.stopPropagation();
                                const newRating = i;
                                // Persist to supabase
                                const newTechData = { ...item.tech_data, rating: newRating };
                                const { error } = await supabase.from('inventory').update({ tech_data: newTechData }).eq('id', item.id);
                                if (error) {
                                    alert('Errore nel salvataggio del rating: ' + error.message);
                                } else {
                                    item.tech_data = newTechData;
                                    renderStars(newRating);
                                }
                            };
                            starsEl.appendChild(star);
                        }
                    };

                    renderStars(rating);
                    infoCol.appendChild(starsEl);
                    topSection.appendChild(infoCol);

                    // Action buttons (side)
                    const sideActions = document.createElement('div');
                    sideActions.className = 'essence-side-actions';

                    const btnAbb = document.createElement('button');
                    btnAbb.className = 'outline';
                    btnAbb.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">link</span>Abbinamenti';
                    btnAbb.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: `pairings:${item.family_id || item.id}` })); };
                    
                    const btnCandles = document.createElement('button');
                    btnCandles.className = 'outline';
                    btnCandles.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">local_fire_department</span>In candele';
                    btnCandles.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: `candles-by-essence:${item.id}` })); };

                    sideActions.appendChild(btnAbb);
                    sideActions.appendChild(btnCandles);
                    topSection.appendChild(sideActions);

                    card.appendChild(topSection);

                    const bottomActions = document.createElement('div');
                    bottomActions.className = 'essence-side-actions';
                    bottomActions.style.flexDirection = 'row';
                    bottomActions.style.justifyContent = 'flex-start';

                    const btnStock = document.createElement('button');
                    btnStock.className = 'outline';
                    btnStock.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">inventory</span>Stock';
                    btnStock.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: `stock:${item.id}` })); };
                    
                    const btnEdit = document.createElement('button');
                    btnEdit.className = 'outline';
                    btnEdit.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">edit</span>Modifica';
                    btnEdit.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: `add-essence:Essenze&id=${item.id}` })); };
                    
                    const btnDelete = document.createElement('button');
                    btnDelete.className = 'outline';
                    btnDelete.style.color = 'var(--md-sys-color-error, #b3261e)';
                    btnDelete.style.borderColor = 'var(--md-sys-color-error, #b3261e)';
                    btnDelete.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">delete</span>Elimina';
                    btnDelete.onclick = async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Eliminare "${item.name}"?`)) return;
                        const { error } = await supabase.from('inventory').delete().eq('id', item.id);
                        if (error) alert('Errore: ' + error.message);
                        else loadList(activeTab);
                    };

                    bottomActions.appendChild(btnStock);
                    bottomActions.appendChild(btnEdit);
                    bottomActions.appendChild(btnDelete);
                    
                    card.appendChild(bottomActions);
                    card.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `add-essence:Essenze&id=${item.id}` }));
                    listContainer.appendChild(card);
                });
            };

            familyFilter.onchange = renderFiltered;
            noteFilter.onchange = renderFiltered;

            renderFiltered();
        }

        function renderFragranzeList(items) {
            const heading = document.createElement('h3');
            heading.className = 'inv-section-title';
            heading.textContent = 'Mix usati';
            listContainer.appendChild(heading);

            const grid = document.createElement('div');
            grid.className = 'items-grid';

            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'essence-card fluid-essence-card';
                
                const topSection = document.createElement('div');
                topSection.className = 'essence-top-section';
                
                const infoCol = document.createElement('div');
                infoCol.className = 'essence-info-col';
                
                const nameEl = document.createElement('div');
                nameEl.className = 'essence-name';
                nameEl.textContent = item.name;
                infoCol.appendChild(nameEl);
                
                const metaEl = document.createElement('div');
                metaEl.className = 'essence-meta';
                metaEl.textContent = 'Mix personalizzato';
                infoCol.appendChild(metaEl);
                
                topSection.appendChild(infoCol);
                
                const sideActions = document.createElement('div');
                sideActions.className = 'essence-side-actions';
                
                const btnInfo = document.createElement('button');
                btnInfo.className = 'outline';
                btnInfo.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">info</span>Info';
                btnInfo.onclick = async (e) => { 
                    e.stopPropagation(); 
                    let msg = `Mix: ${item.name}\n\n`;
                    const idsToFetch = [item.head_scent_id, item.heart_scent_id, item.base_scent_id].filter(Boolean);
                    if(idsToFetch.length > 0) {
                        const { data: invScents } = await supabase.from('inventory').select('id, name').in('id', idsToFetch);
                        const scentMap = {};
                        (invScents || []).forEach(s => scentMap[s.id] = s.name);
                        if(item.head_scent_id) msg += `Note di Testa: ${scentMap[item.head_scent_id] || 'Sconosciuta'}\n`;
                        if(item.heart_scent_id) msg += `Note di Cuore: ${scentMap[item.heart_scent_id] || 'Sconosciuta'}\n`;
                        if(item.base_scent_id) msg += `Note di Fondo: ${scentMap[item.base_scent_id] || 'Sconosciuta'}\n`;
                    } else {
                        msg += "Nessuna essenza specificata per questo mix.";
                    }
                    alert(msg);
                };
                
                const btnCandles = document.createElement('button');
                btnCandles.className = 'outline';
                btnCandles.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">local_fire_department</span>In candele';
                btnCandles.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: `candles-by-essence:${item.id}` })); };
                
                sideActions.appendChild(btnInfo);
                sideActions.appendChild(btnCandles);
                topSection.appendChild(sideActions);
                
                card.appendChild(topSection);
                
                const bottomActions = document.createElement('div');
                bottomActions.className = 'essence-side-actions';
                bottomActions.style.flexDirection = 'row';
                bottomActions.style.justifyContent = 'flex-start';
                
                const btnDelete = document.createElement('button');
                btnDelete.className = 'outline';
                btnDelete.style.color = 'var(--md-sys-color-error, #b3261e)';
                btnDelete.style.borderColor = 'var(--md-sys-color-error, #b3261e)';
                btnDelete.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">delete</span>Elimina';
                btnDelete.onclick = async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Eliminare "${item.name}"?`)) return;
                    const { error } = await supabase.from('blends').delete().eq('id', item.id);
                    if (error) alert('Errore: ' + error.message);
                    else loadList(activeTab);
                };
                
                bottomActions.appendChild(btnDelete);
                card.appendChild(bottomActions);
                
                grid.appendChild(card);
            });
            listContainer.appendChild(grid);
        }

        function renderCandeleList(items) {
            const heading = document.createElement('h3');
            heading.className = 'inv-section-title';
            heading.textContent = 'Candele fatte';
            listContainer.appendChild(heading);

            const grid = document.createElement('div');
            grid.className = 'items-grid';

            items.forEach(log => {
                const card = document.createElement('div');
                card.className = 'essence-card fluid-essence-card';
                const created = new Date(log.created_at).toLocaleDateString('it-IT');

                const topSection = document.createElement('div');
                topSection.className = 'essence-top-section';
                
                const infoCol = document.createElement('div');
                infoCol.className = 'essence-info-col';
                
                const nameEl = document.createElement('div');
                nameEl.className = 'essence-name';
                nameEl.textContent = log.blends?.name || 'Candela';
                infoCol.appendChild(nameEl);
                
                const metaEl = document.createElement('div');
                metaEl.className = 'essence-meta';
                metaEl.textContent = `Batch ${log.batch_number || '—'} • ${created}`;
                infoCol.appendChild(metaEl);
                
                topSection.appendChild(infoCol);
                
                const sideActions = document.createElement('div');
                sideActions.className = 'essence-side-actions';
                
                const btnInfo = document.createElement('button');
                btnInfo.className = 'outline';
                btnInfo.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">info</span>Info';
                btnInfo.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: 'candle-detail:' + log.id })); };
                
                sideActions.appendChild(btnInfo);
                topSection.appendChild(sideActions);
                card.appendChild(topSection);

                const bottomActions = document.createElement('div');
                bottomActions.className = 'essence-side-actions';
                bottomActions.style.flexDirection = 'row';
                bottomActions.style.justifyContent = 'flex-start';
                
                const btnDelete = document.createElement('button');
                btnDelete.className = 'outline';
                btnDelete.style.color = 'var(--md-sys-color-error, #b3261e)';
                btnDelete.style.borderColor = 'var(--md-sys-color-error, #b3261e)';
                btnDelete.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">delete</span>Elimina';
                btnDelete.onclick = async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Eliminare la candela "${log.blends?.name || 'Candela'}"?`)) return;
                    const { error } = await supabase.from('candle_log').delete().eq('id', log.id);
                    if (error) alert('Errore: ' + error.message);
                    else loadList(activeTab);
                };
                
                bottomActions.appendChild(btnDelete);
                card.appendChild(bottomActions);
                
                card.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'candle-detail:' + log.id }));
                grid.appendChild(card);
            });
            listContainer.appendChild(grid);
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
