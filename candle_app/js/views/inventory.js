// ===================================================
// INVENTORY.JS - Gestione Magazzino (con 5 tab)
// ===================================================

import { supabase } from '../supabase.js';
import { createButton, createTitle } from '../components.js?v=3';
import { getImageUrlFromRecord, deleteImageFromCloudinary } from '../image.js';
import * as Store from '../store.js';

export async function renderInventory(container) {
    console.log('[VIEW] Rendering Inventory...');
    try {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'inventory-wrapper';

        const title = createTitle('Magazzino', 2);
        title.classList.add('page-title');
        wrapper.appendChild(title);

        // Tabs: Cere, Stampi, Essenze, Mix usati, Candele
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

        // Usa lo store per mantenere il tab attivo
        let activeTab = Store.getInventoryTab() || 'Cere';

        tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn' + (tab.id === activeTab ? ' active' : '');
            btn.textContent = tab.label;
            btn.onclick = async () => {
                activeTab = tab.id; 
                Store.setInventoryTab(tab.id);
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
            if (activeTab === 'Candele') {
                // Candele: apre il wizard completo
                window.dispatchEvent(new CustomEvent('navigate', { detail: 'lab' }));
            } else if (activeTab === 'Fragranze') {
                // Mix usati: apre edit-blend senza ID (modalità creazione)
                window.dispatchEvent(new CustomEvent('navigate', { detail: 'edit-blend' }));
            } else {
                // Cere, Stampi, Essenze: apre add-essence
                window.dispatchEvent(new CustomEvent('navigate', { detail: `add-essence:${activeTab}` }));
            }
        };
        wrapper.appendChild(addBtn);

        // Content
        const listContainer = document.createElement('div');
        listContainer.className = 'items-container';
        wrapper.appendChild(listContainer);

        let cardMinWidth = 320;

        let isLayoutPending = false;
        const requestCardLayout = () => {
            if (isLayoutPending) return;
            isLayoutPending = true;
            window.requestAnimationFrame(() => {
                isLayoutPending = false;

                const containerWidth = listContainer.getBoundingClientRect().width || window.innerWidth;
                const minWidth = cardMinWidth;

                // Quante card possono starci interamente (senza overflow)
                const maxCards = Math.max(1, Math.floor(containerWidth / minWidth));

                // Spazio residuo disponibile
                const usedWidth = maxCards * minWidth;
                const remaining = Math.max(0, containerWidth - usedWidth);

                // Calcola gap uniforme tra card e ai bordi (cols + 1 spazi)
                let dynamicGap = remaining / (maxCards + 1);

                // Limita gap per non creare spacing enormi
                dynamicGap = Math.max(12, Math.min(dynamicGap, 60));

                if (listContainer.classList.contains('items-grid')) {
                    listContainer.style.display = 'grid';
                    listContainer.style.gridTemplateColumns = `repeat(auto-fill, minmax(${minWidth}px, 1fr))`;
                    listContainer.style.gap = `${dynamicGap}px`;
                    listContainer.style.paddingLeft = `${dynamicGap}px`;
                    listContainer.style.paddingRight = `${dynamicGap}px`;
                } else {
                    listContainer.style.display = 'flex';
                    listContainer.style.flexDirection = 'column';
                    listContainer.style.alignItems = 'center';
                    listContainer.style.gap = `${Math.max(14, dynamicGap)}px`;
                    listContainer.style.paddingLeft = '16px';
                    listContainer.style.paddingRight = '16px';
                }
            });
        };


        const resizeObserver = new ResizeObserver(() => requestCardLayout());
        resizeObserver.observe(listContainer);

        window.addEventListener('resize', requestCardLayout);

        // Determine current user (to scope inventory)
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        // Families cache for essences
        let familiesMap = {};
        const { data: famData } = await supabase.from('families').select('id, name_it');
        (famData || []).forEach(f => { familiesMap[f.id] = f.name_it || ''; });

        async function loadList(category) {
            listContainer.innerHTML = '';
            // Adjust container layout for category
            if (category === 'Stampi' || category === 'Fragranze' || category === 'Candele') {
                listContainer.className = 'items-container items-grid';
                cardMinWidth = category === 'Stampi' ? 280 : 320;
            } else if (category === 'Essenze') {
                listContainer.className = 'items-container items-list';
                cardMinWidth = 320;
            } else {
                listContainer.className = 'items-container items-list';
                cardMinWidth = 320;
            }

            requestCardLayout();

            let data, error;
            if (category === 'Fragranze') {
                const res = await supabase.from('blends').select('*').eq('user_id', userId).order('name');
                data = res.data; error = res.error;
            } else if (category === 'Candele') {
                const res = await supabase.from('candle_log').select('*, blends(name, resulting_family_id)').eq('user_id', userId).order('created_at', { ascending: false });
                data = res.data; error = res.error;
            } else {
                const dbCategory = categoryMap[category] || category;
                let query = supabase.from('inventory').select('id, user_id, name, category, quantity_g, supplier, family_id, tech_data, image_ref').eq('category', dbCategory);
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
            else if (category === 'Candele') await renderCandeleList(data);
        }

        // ===== CERE: simple list =====
        function renderWaxList(items) {
            // Add margin-top to create space between add button and cards
            listContainer.style.marginTop = '20px';

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

                const actions = document.createElement('div');
                actions.className = 'card-actions';
                actions.style.display = 'flex';
                actions.style.gap = '8px';
                actions.style.marginTop = '8px';

                const editBtn = createButton('Modifica', 'edit', 'btn-card-edit');
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('navigate', { detail: `add-essence:Stampi&id=${item.id}` }));
                };
                actions.appendChild(editBtn);

                const deleteBtn = createButton('Elimina', 'delete', 'btn-card-delete');
                deleteBtn.onclick = async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Eliminare "${item.name}"?`)) return;

                    const deleteToken = item?.tech_data?.cloudinary_delete_token;
                    const publicId = item?.tech_data?.cloudinary_public_id;
                    let cloudError = null;

                    if (deleteToken) {
                        try {
                            await deleteImageFromCloudinary(deleteToken);
                        } catch (err) {
                            console.warn('[INVENTORY] Cloudinary delete failed by token', err);
                            cloudError = err;
                        }
                    } else if (publicId) {
                        console.warn('[INVENTORY] No delete token; image remains in Cloudinary until backend cleanup', { publicId });
                    }

                    const { error } = await supabase.from('inventory').delete().eq('id', item.id);
                    if (error) {
                        alert('Errore: ' + error.message);
                    } else {
                        if (cloudError) {
                            alert('Elemento eliminato, ma non è stato possibile cancellare l\'immagine da Cloudinary.');
                        }
                        loadList(activeTab);
                    }
                };
                actions.appendChild(deleteBtn);

                card.appendChild(actions);

                card.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `inventory-detail:${item.id}` }));
                listContainer.appendChild(card);
            });
        }

        // ===== ESSENZE: detailed cards =====
        function renderEssenceList(items) {
            // Add margin-top to create space between add button and cards
            listContainer.style.marginTop = '20px';

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

                    // Action buttons (side) - Modifica ed Elimina a destra, verticalmente
                    const sideActions = document.createElement('div');
                    sideActions.className = 'essence-side-actions';

                    const btnEdit = document.createElement('button');
                    btnEdit.className = 'outline';
                    btnEdit.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">edit</span>Modifica';
                    btnEdit.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: `add-essence:Essenze&id=${item.id}` })); };
                    
                    const btnDelete = document.createElement('button');
                    btnDelete.className = 'outline-red';
                    btnDelete.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">delete</span>Elimina';
                    btnDelete.onclick = async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Eliminare "${item.name}"?`)) return;

                        const deleteToken = item?.tech_data?.cloudinary_delete_token;
                        const publicId = item?.tech_data?.cloudinary_public_id;
                        let cloudError = null;

                        if (deleteToken) {
                            try {
                                await deleteImageFromCloudinary(deleteToken);
                            } catch (err) {
                                console.warn('[INVENTORY] Cloudinary delete failed by token', err);
                                cloudError = err;
                            }
                        } else if (publicId) {
                            console.warn('[INVENTORY] Cloudinary delete token unavailable; image can only be deleted via backend API using Admin API key for public_id:', publicId);
                        }

                        const { error } = await supabase.from('inventory').delete().eq('id', item.id);
                        if (error) {
                            alert('Errore: ' + error.message);
                        } else {
                            if (cloudError) {
                                alert('Elemento eliminato, ma non è stato possibile cancellare l\'immagine da Cloudinary. Controlla la console per i dettagli.');
                            }
                            loadList(activeTab);
                        }
                    };

                    sideActions.appendChild(btnEdit);
                    sideActions.appendChild(btnDelete);
                    topSection.appendChild(sideActions);

                    card.appendChild(topSection);

                    // Bottom actions - Stock, Abbinamenti, In candele su una riga, centrati
                    const bottomActions = document.createElement('div');
                    bottomActions.className = 'essence-bottom-actions';

                    const btnStock = document.createElement('button');
                    btnStock.className = 'outline';
                    btnStock.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">inventory</span>Stock';
                    btnStock.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: `stock:${item.id}` })); };

                    const btnAbb = document.createElement('button');
                    btnAbb.className = 'outline';
                    btnAbb.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">link</span>Abbinamenti';
                    btnAbb.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: `pairings:${item.family_id || item.id}` })); };
                    
                    const btnCandles = document.createElement('button');
                    btnCandles.className = 'outline';
                    btnCandles.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">local_fire_department</span>In candele';
                    btnCandles.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: `candles-by-essence:${item.id}` })); };

                    bottomActions.appendChild(btnStock);
                    bottomActions.appendChild(btnAbb);
                    bottomActions.appendChild(btnCandles);
                    
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
            // Add margin-top to create space between add button and cards
            listContainer.style.marginTop = '20px';

            const grid = document.createElement('div');
            grid.className = 'items-grid';

            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'essence-card fluid-essence-card';

                const createdDate = item.created_at ? new Date(item.created_at).toLocaleDateString('it-IT') : '—';
                const familyName = item.resulting_family_id ? (familiesMap[item.resulting_family_id] || '—') : '—';

                // Top section: info
                const topSection = document.createElement('div');
                topSection.style.marginBottom = '16px';

                const titleEl = document.createElement('div');
                titleEl.className = 'essence-name';
                titleEl.textContent = item.name;
                topSection.appendChild(titleEl);

                const dateEl = document.createElement('div');
                dateEl.className = 'essence-meta';
                dateEl.textContent = `Creato il ${createdDate}`;
                topSection.appendChild(dateEl);

                const familyEl = document.createElement('div');
                familyEl.className = 'essence-meta';
                familyEl.textContent = `Famiglia: ${familyName}`;
                topSection.appendChild(familyEl);

                card.appendChild(topSection);

                // Bottom actions - tutti i bottoni sulla stessa riga come le Candele
                const bottomActions = document.createElement('div');
                bottomActions.className = 'essence-side-actions';
                bottomActions.style.flexDirection = 'row';
                bottomActions.style.justifyContent = 'center';

                const btnInfo = document.createElement('button');
                btnInfo.className = 'outline';
                btnInfo.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">info</span>Info';
                btnInfo.onclick = async (e) => {
                    e.stopPropagation();

                    let infoText = `Nome: ${item.name}\n`;

                    const notes = [];
                    const idsToFetch = [];
                    if(item.head_scent_id) idsToFetch.push(item.head_scent_id);
                    if(item.heart_scent_id) idsToFetch.push(item.heart_scent_id);
                    if(item.base_scent_id) idsToFetch.push(item.base_scent_id);

                    if(idsToFetch.length > 0) {
                        const { data: scents } = await supabase.from('inventory').select('id, name').in('id', idsToFetch);
                        const scentMap = {};
                        (scents || []).forEach(s => scentMap[s.id] = s.name);

                        if(item.head_scent_id) notes.push(`Testa: ${scentMap[item.head_scent_id] || 'Sconosciuta'}`);
                        if(item.heart_scent_id) notes.push(`Cuore: ${scentMap[item.heart_scent_id] || 'Sconosciuta'}`);
                        if(item.base_scent_id) notes.push(`Fondo: ${scentMap[item.base_scent_id] || 'Sconosciuta'}`);
                    }

                    if(notes.length > 0) {
                        infoText += '\nNote olfattive:\n' + notes.join('\n');
                    } else {
                        infoText += '\nNote olfattive: Nessuna specificata';
                    }

                    const userId = (await supabase.auth.getUser()).data.user?.id;
                    const { data: candles } = await supabase.from('candle_log')
                        .select('id, batch_number, created_at')
                        .eq('blend_id', item.id)
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false });

                    if (candles && candles.length > 0) {
                        const candleNames = candles.map((c, idx) => {
                            const label = c.batch_number ? `Candela ${c.batch_number}` : `Candela ${idx + 1}`;
                            return label;
                        });
                        infoText += `\n\nCandele in cui è presente:\n${candleNames.join('\n')}`;
                    } else {
                        infoText += '\n\nCandele in cui è presente: nessuna';
                    }

                    alert(infoText);
                };

                const btnModifica = document.createElement('button');
                btnModifica.className = 'outline';
                btnModifica.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">edit</span>Modifica';
                btnModifica.onclick = (e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('navigate', { detail: `edit-blend:${item.id}` }));
                };

                const btnElimina = document.createElement('button');
                btnElimina.className = 'outline-red';
                btnElimina.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">delete</span>Elimina';
                btnElimina.onclick = async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Eliminare "${item.name}"?`)) return;
                    const { error } = await supabase.from('blends').delete().eq('id', item.id);
                    if (error) alert('Errore: ' + error.message);
                    else loadList(activeTab);
                };

                bottomActions.appendChild(btnInfo);
                bottomActions.appendChild(btnModifica);
                bottomActions.appendChild(btnElimina);
                card.appendChild(bottomActions);

                grid.appendChild(card);
            });
            listContainer.appendChild(grid);
        }

        async function renderCandeleList(items) {
            // Add margin-top to create space between add button and cards
            listContainer.style.marginTop = '20px';

            const grid = document.createElement('div');
            grid.className = 'items-grid';

            // Fetch mold info to show nome/capacità
            const moldIds = Array.from(new Set(items.map(i => i.mold_id).filter(Boolean)));
            const moldResp = moldIds.length > 0 ? await supabase.from('inventory').select('id, name, quantity_g, image_ref').in('id', moldIds) : { data: [] };
            const moldMap = {};
            (moldResp.data || []).forEach(m => { moldMap[m.id] = m; });

            items.forEach(log => {
                const card = document.createElement('div');
                card.className = 'essence-card fluid-essence-card';
                const created = new Date(log.created_at).toLocaleDateString('it-IT');

                const mold = moldMap[log.mold_id];
                const candleName = log.blends?.name || `Candela ${log.batch_number || '—'}`;
                const familyName = log.blends?.resulting_family_id ? (familiesMap[log.blends.resulting_family_id] || '—') : '—';

                const topSection = document.createElement('div');
                topSection.className = 'candle-top-section';

                const infoCol = document.createElement('div');
                infoCol.className = 'candle-info-col';
                const nameEl = document.createElement('div');
                nameEl.className = 'essence-name';
                nameEl.textContent = candleName;
                infoCol.appendChild(nameEl);

                const details = [
                    { label: 'Stampo', value: mold?.name || '—' },
                    { label: 'Capacità stampo', value: mold?.quantity_g ? `${mold.quantity_g} g` : '—' },
                    { label: 'Composizione', value: log.blends?.name || '—' },
                    { label: 'Famiglia', value: familyName }
                ];

                details.forEach(item => {
                    const d = document.createElement('div');
                    d.className = 'essence-meta';
                    d.textContent = `${item.label}: ${item.value}`;
                    infoCol.appendChild(d);
                });

                topSection.appendChild(infoCol);

                const imageCol = document.createElement('div');
                imageCol.className = 'candle-image-col';

                const imageUrl = getImageUrlFromRecord(mold);
                if (imageUrl) {
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.alt = mold?.name || 'Stampo';
                    img.className = 'card-media';
                    imageCol.appendChild(img);
                } else {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'card-media placeholder';
                    placeholder.innerHTML = '<span class="material-symbols-outlined" style="font-size: 2rem;">image_not_supported</span>';
                    imageCol.appendChild(placeholder);
                }

                const stars = document.createElement('div');
                stars.className = 'essence-stars';
                for (let i = 1; i <= 5; i++) {
                    const star = document.createElement('span');
                    star.textContent = i <= (log.rating || 0) ? '★' : '☆';
                    star.className = i <= (log.rating || 0) ? 'essence-star filled' : 'essence-star';
                    stars.appendChild(star);
                }
                imageCol.appendChild(stars);
                topSection.appendChild(imageCol);

                card.appendChild(topSection);

                const bottomActions = document.createElement('div');
                bottomActions.className = 'essence-side-actions';
                bottomActions.style.flexDirection = 'row';
                bottomActions.style.justifyContent = 'center';

                const btnInfo = document.createElement('button');
                btnInfo.className = 'outline';
                btnInfo.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">info</span>Info';
                btnInfo.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: 'candle-detail:' + log.id })); };

                const btnEdit = document.createElement('button');
                btnEdit.className = 'outline';
                btnEdit.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">edit</span>Modifica';
                btnEdit.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: 'lab:logId=' + log.id })); };

                const btnDelete = document.createElement('button');
                btnDelete.className = 'outline-red';
                btnDelete.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">delete</span>Elimina';
                btnDelete.onclick = async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Eliminare la candela "${candleName}"?`)) return;
                    const { error } = await supabase.from('candle_log').delete().eq('id', log.id);
                    if (error) alert('Errore: ' + error.message);
                    else loadList(activeTab);
                };

                bottomActions.appendChild(btnInfo);
                bottomActions.appendChild(btnEdit);
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
