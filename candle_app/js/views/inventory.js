// ===================================================
// INVENTORY.JS - Gestione Magazzino (Custom Vercel Auth)
// ===================================================

import { createButton, createTitle } from '../components.js?v=3';
import { getImageUrlFromRecord, deleteImageFromCloudinary, deleteImageByPublicId } from '../image.js?v=5';
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
                window.dispatchEvent(new CustomEvent('navigate', { detail: 'lab' }));
            } else if (activeTab === 'Fragranze') {
                window.dispatchEvent(new CustomEvent('navigate', { detail: 'edit-blend' }));
            } else {
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
                const maxCards = Math.max(1, Math.floor(containerWidth / minWidth));
                const usedWidth = maxCards * minWidth;
                const remaining = Math.max(0, containerWidth - usedWidth);
                let dynamicGap = remaining / (maxCards + 1);
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

        // AUTH: Lettura dal LocalStorage
        const user = JSON.parse(localStorage.getItem('candle_user') || 'null');
        const userId = user?.id;

        // Families cache for essences
        let familiesMap = {};
        try {
            const famRes = await fetch('/api/families');
            if (famRes.ok) {
                const famData = await famRes.json();
                (famData || []).forEach(f => { familiesMap[f.id] = f.name_it || ''; });
            }
        } catch(e) { console.error("Errore caricamento famiglie", e); }

        async function loadList(category) {
            listContainer.innerHTML = '';
            
            if (category === 'Stampi' || category === 'Fragranze' || category === 'Candele') {
                listContainer.className = 'items-container items-grid';
                cardMinWidth = category === 'Stampi' ? 280 : 320;
            } else {
                listContainer.className = 'items-container items-list';
                cardMinWidth = 320;
            }
            requestCardLayout();

            let data, error;
            try {
                if (category === 'Fragranze') {
                    // Migrato: Fetch API Vercel
                    const res = await fetch(`/api/blends?user_id=${userId}`);
                    if (!res.ok) throw new Error('Errore caricamento mix');
                    data = await res.json();
                } else if (category === 'Candele') {
                    // Migrato: Fetch API Vercel
                    const res = await fetch(`/api/candles?user_id=${userId}`);
                    if (!res.ok) throw new Error('Errore caricamento candele');
                    data = await res.json();
                } else {
                    const dbCategory = categoryMap[category] || category;
                    let url = `/api/inventory?category=${dbCategory}`;
                    if (userId) url += `&user_id=${userId}`;
                    
                    const res = await fetch(url);
                    if (!res.ok) {
                        const errData = await res.json();
                        throw new Error(errData.error || 'Errore database');
                    }
                    data = await res.json();
                }
            } catch (err) {
                error = err;
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

        // ===== CERE =====
        function renderWaxList(items) {
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

        // ===== STAMPI =====
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
                    const fallbackPublicId = item?.image_ref || item?.image_url || null;
                    let cloudError = null;

                    if (deleteToken) {
                        try { await deleteImageFromCloudinary(deleteToken); } 
                        catch (err) { cloudError = err; }
                    } else if (publicId || fallbackPublicId) {
                        try { await deleteImageByPublicId(publicId || fallbackPublicId); } 
                        catch (err) { cloudError = err; }
                    }

                    try {
                        const res = await fetch(`/api/inventory?id=${item.id}`, { method: 'DELETE' });
                        if (!res.ok) throw new Error('Errore durante l\'eliminazione');
                        
                        if (cloudError) alert('Elemento eliminato, ma errore su Cloudinary: ' + cloudError.message);
                        loadList(activeTab);
                    } catch (err) {
                        alert('Errore: ' + err.message);
                    }
                };
                actions.appendChild(deleteBtn);
                card.appendChild(actions);

                card.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: `inventory-detail:${item.id}` }));
                listContainer.appendChild(card);
            });
        }

        // ===== ESSENZE =====
        function renderEssenceList(items) {
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
                                const newTechData = { ...item.tech_data, rating: newRating };
                                
                                const updatedItem = { ...item, tech_data: newTechData };
                                try {
                                    const res = await fetch('/api/inventory', {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(updatedItem)
                                    });
                                    if (!res.ok) throw new Error('Salvataggio fallito');
                                    item.tech_data = newTechData;
                                    renderStars(newRating);
                                } catch (err) {
                                    alert('Errore nel salvataggio del rating: ' + err.message);
                                }
                            };
                            starsEl.appendChild(star);
                        }
                    };

                    renderStars(rating);
                    infoCol.appendChild(starsEl);
                    topSection.appendChild(infoCol);

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
                            try { await deleteImageFromCloudinary(deleteToken); } 
                            catch (err) { cloudError = err; }
                        } else if (publicId || item?.image_ref || item?.image_url) {
                            try { await deleteImageByPublicId(publicId || item?.image_ref || item?.image_url); } 
                            catch (err) { cloudError = err; }
                        }

                        try {
                            const res = await fetch(`/api/inventory?id=${item.id}`, { method: 'DELETE' });
                            if (!res.ok) throw new Error('Errore durante l\'eliminazione');
                            
                            if (cloudError) alert('Elemento eliminato, ma errore su Cloudinary.');
                            loadList(activeTab);
                        } catch (err) {
                            alert('Errore: ' + err.message);
                        }
                    };

                    sideActions.appendChild(btnEdit);
                    sideActions.appendChild(btnDelete);
                    topSection.appendChild(sideActions);
                    card.appendChild(topSection);

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

        // ===== MIX =====
        function renderFragranzeList(items) {
            listContainer.style.marginTop = '20px';
            const grid = document.createElement('div');
            grid.className = 'items-grid';

            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'essence-card fluid-essence-card';

                const createdDate = item.created_at ? new Date(item.created_at).toLocaleDateString('it-IT') : '—';
                const familyName = item.resulting_family_id ? (familiesMap[item.resulting_family_id] || '—') : '—';

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
                        try {
                            const res = await fetch(`/api/inventory?ids=${idsToFetch.join(',')}`);
                            if(res.ok) {
                                const scents = await res.json();
                                const scentMap = {};
                                (scents || []).forEach(s => scentMap[s.id] = s.name);

                                if(item.head_scent_id) notes.push(`Testa: ${scentMap[item.head_scent_id] || 'Sconosciuta'}`);
                                if(item.heart_scent_id) notes.push(`Cuore: ${scentMap[item.heart_scent_id] || 'Sconosciuta'}`);
                                if(item.base_scent_id) notes.push(`Fondo: ${scentMap[item.base_scent_id] || 'Sconosciuta'}`);
                            }
                        } catch(err) { console.warn('Errore fetch nomi essenze', err); }
                    }

                    infoText += notes.length > 0 ? '\nNote olfattive:\n' + notes.join('\n') : '\nNote olfattive: Nessuna specificata';

                    try {
                        const cRes = await fetch(`/api/candles?blend_id=${item.id}&user_id=${userId}`);
                        if (cRes.ok) {
                            const candles = await cRes.json();
                            if (candles && candles.length > 0) {
                                const candleNames = candles.map((c, idx) => c.batch_number ? `Candela ${c.batch_number}` : `Candela ${idx + 1}`);
                                infoText += `\n\nCandele in cui è presente:\n${candleNames.join('\n')}`;
                            } else {
                                infoText += '\n\nCandele in cui è presente: nessuna';
                            }
                        }
                    } catch(err) { infoText += '\n\nErrore nel recupero candele associate.'; }

                    alert(infoText);
                };

                const btnModifica = document.createElement('button');
                btnModifica.className = 'outline';
                btnModifica.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">edit</span>Modifica';
                btnModifica.onclick = (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: `edit-blend:${item.id}` })); };

                const btnElimina = document.createElement('button');
                btnElimina.className = 'outline-red';
                btnElimina.innerHTML = '<span class="material-symbols-outlined btn-icon" style="font-size: 16px;">delete</span>Elimina';
                btnElimina.onclick = async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Eliminare "${item.name}"?`)) return;
                    try {
                        const res = await fetch(`/api/blends?id=${item.id}`, { method: 'DELETE' });
                        if (!res.ok) throw new Error('Errore durante l\'eliminazione');
                        loadList(activeTab);
                    } catch(err) { alert('Errore: ' + err.message); }
                };

                bottomActions.appendChild(btnInfo);
                bottomActions.appendChild(btnModifica);
                bottomActions.appendChild(btnElimina);
                card.appendChild(bottomActions);

                grid.appendChild(card);
            });
            listContainer.appendChild(grid);
        }

        // ===== CANDELE =====
        async function renderCandeleList(items) {
            listContainer.style.marginTop = '20px';
            const grid = document.createElement('div');
            grid.className = 'items-grid';

            const moldIds = Array.from(new Set(items.map(i => i.mold_id).filter(Boolean)));
            const blendIds = Array.from(new Set(items.map(i => i.blend_id).filter(Boolean)));
            
            let moldMap = {};
            let blendMap = {};

            try {
                if (moldIds.length > 0) {
                    const mRes = await fetch(`/api/inventory?ids=${moldIds.join(',')}`);
                    if(mRes.ok) {
                        const mData = await mRes.json();
                        mData.forEach(m => moldMap[m.id] = m);
                    }
                }
                if (blendIds.length > 0) {
                    const bRes = await fetch(`/api/blends?ids=${blendIds.join(',')}`);
                    if(bRes.ok) {
                        const bData = await bRes.json();
                        bData.forEach(b => blendMap[b.id] = b);
                    }
                }
            } catch(e) { console.warn("Errore caricamento dettagli candele", e); }

            items.forEach(log => {
                const card = document.createElement('div');
                card.className = 'essence-card fluid-essence-card';

                const mold = moldMap[log.mold_id];
                const blend = blendMap[log.blend_id];
                const candleName = blend?.name || `Candela ${log.batch_number || '—'}`;
                const familyName = blend?.resulting_family_id ? (familiesMap[blend.resulting_family_id] || '—') : '—';

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
                    { label: 'Composizione', value: blend?.name || '—' },
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
                    try {
                        const res = await fetch(`/api/candles?id=${log.id}`, { method: 'DELETE' });
                        if (!res.ok) throw new Error('Errore durante l\'eliminazione');
                        loadList(activeTab);
                    } catch(err) { alert('Errore: ' + err.message); }
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

        await loadList(activeTab);

        container.appendChild(wrapper);
    } catch (e) {
        console.error('[VIEW] renderInventory error', e);
        container.innerHTML = `<h1>Errore nel caricamento</h1><pre>${e.message || e}</pre>`;
    }
}