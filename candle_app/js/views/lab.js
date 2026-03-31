// ===================================================
// LAB.JS - Wizard Creazione Candela (multi-step)
// ===================================================

import { supabase } from '../supabase.js';
import { createButton, createTitle } from '../components.js?v=3';
import { getImageUrlFromRecord } from '../image.js';
import * as Store from '../store.js';

export async function renderLab(container, param) {
    console.log('[VIEW] Rendering Lab...', param);
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'lab-wrapper';

    // Parse optional navigation parameters (e.g., "wax=<id>", "ess=<id>")
    const navParams = {};
    if (param) {
        param.split(/[&;]/g).forEach(pair => {
            const [k, v] = pair.split('=');
            if (!k) return;
            navParams[k] = v || '';
        });
    }

    let editingLogId = navParams.logId || null;
    let editingLog = null;

    const title = createTitle('Crea una candela', 2);
    title.classList.add('page-title');
    wrapper.appendChild(title);

    // --- Current user ---
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // --- State: Carica dallo store o inizializza ---
    const savedWizard = Store.getWizardState();
    
    // Se stiamo editando una candela esistente, resetta lo stato wizard
    if (editingLogId && editingLogId !== savedWizard.editingLogId) {
        Store.resetWizard();
        Store.setWizardEditingLogId(editingLogId);
    }
    
    // Usa lo stato salvato se presente e non stiamo iniziando da zero
    let currentStep = editingLogId ? 2 : (savedWizard.currentStep || 0);
    let selectedMold = savedWizard.selectedMold || null;
    let selectedWax = savedWizard.selectedWax || null;
    let selectedEssences = savedWizard.selectedEssences || [];
    let fragrancePct = savedWizard.fragrancePct || 8; // Default 8%, range 5-12%
    let candleName = savedWizard.candleName || '';
    let fragranceName = savedWizard.fragranceName || '';
    let fragranceNote = '';
    let fragranceFamily = '';

    let defaultCandleName = 'Candela 1';
    let nextBatchNumber = 1;

    // Funzione per salvare lo stato corrente nello store
    const saveStateToStore = () => {
        Store.setWizardState({
            currentStep,
            selectedMold,
            selectedWax,
            selectedEssences,
            fragrancePct,
            candleName,
            fragranceName,
            editingLogId
        });
    };

    const formatNoteType = (noteType) => {
        if (!noteType) return '';
        if (noteType === 'base') return 'di fondo';
        if (noteType === 'heart') return 'di cuore';
        if (noteType === 'head') return 'di testa';
        return noteType;
    };

    const computeFragranceNote = () => {
        const notes = selectedEssences
            .map(e => e.note_type)
            .filter(Boolean);
        if (notes.length === 0) return '';
        // Prefer head > heart > base
        if (notes.includes('head')) return 'di testa';
        if (notes.includes('heart')) return 'di cuore';
        if (notes.includes('base')) return 'di fondo';
        return formatNoteType(notes[0]);
    };

    const computeFragranceFamily = () => {
        const familyCounts = {};
        selectedEssences.forEach(e => {
            if (e.family_id) familyCounts[e.family_id] = (familyCounts[e.family_id] || 0) + 1;
        });
        const topFamilyId = Object.entries(familyCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([fam]) => fam)[0];
        return topFamilyId ? (familiesMap[topFamilyId] || '') : '';
    };

    const computeDefaultCandleName = async () => {
        try {
            const { data: lastBatch, error: batchError } = await supabase
                .from('candle_log')
                .select('batch_number')
                .eq('user_id', userId)
                .order('batch_number', { ascending: false })
                .limit(1);

            if (!batchError && lastBatch && lastBatch.length > 0) {
                const raw = lastBatch[0].batch_number;
                const parsed = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
                if (!Number.isNaN(parsed)) {
                    nextBatchNumber = parsed + 1;
                } else if (typeof raw === 'number') {
                    nextBatchNumber = raw + 1;
                }
            }
        } catch (e) {
            console.warn('[LAB] Unable to compute next batch number, defaulting to 1', e);
        }

        defaultCandleName = `Candela ${nextBatchNumber}`;
        if (!candleName || candleName.startsWith('Candela')) candleName = defaultCandleName;
    };

    // Start loading default name ASAP (does not block UI)
    computeDefaultCandleName();

    // --- Fetch data ---
    const buildInventoryQuery = (category) => {
        const q = supabase.from('inventory').select('id, user_id, name, category, quantity_g, supplier, family_id, tech_data, image_ref').eq('category', category);
        if (userId) q.eq('user_id', userId);
        return q;
    };

    const [moldsRes, waxesRes, essencesRes, familiesRes, pairingsRes] = await Promise.all([
        buildInventoryQuery('mold').order('name'),
        buildInventoryQuery('wax').order('name'),
        buildInventoryQuery('scent').order('name'),
        supabase.from('families').select('*'),
        supabase.from('family_pairings').select('source_family_id, target_family_id, type')
    ]);
    const molds = moldsRes.data || [];
    const waxes = waxesRes.data || [];
    const essences = essencesRes.data || [];
    const familiesMap = {};
    (familiesRes.data || []).forEach(f => { familiesMap[f.id] = f.name_it || f.name || ''; });
    const pairings = pairingsRes.data || [];

    // Pre-select items from navigation params (e.g. lab:wax=<id>, lab:ess=<id>)
    if (navParams.mold) selectedMold = molds.find(m => m.id === navParams.mold) || null;
    if (navParams.wax) selectedWax = waxes.find(w => w.id === navParams.wax) || null;
    if (navParams.ess) {
        const ids = String(navParams.ess).split(',').map(s => s.trim()).filter(Boolean);
        selectedEssences = ids
            .map(id => {
                const e = essences.find(x => x.id === id);
                if (!e) return null;
                return {
                    id: e.id,
                    name: e.name,
                    family_name: familiesMap[e.family_id] || '',
                    family_id: e.family_id,
                    note_type: e.tech_data?.note_type || ''
                };
            })
            .filter(Boolean);
    }

    // If we were opened to edit an existing candle, prefill the form
    if (editingLogId) {
        try {
            const { data: log, error: logError } = await supabase.from('candle_log').select('*').eq('id', editingLogId).maybeSingle();
            if (!logError && log) {
                editingLog = log;

                if (log.batch_number) {
                    defaultCandleName = `Candela ${log.batch_number}`;
                    candleName = defaultCandleName;
                }

                if (log.mold_id) selectedMold = molds.find(m => m.id === log.mold_id) || selectedMold;
                if (log.wax_id) selectedWax = waxes.find(w => w.id === log.wax_id) || selectedWax;
                if (typeof log.fragrance_load_percent === 'number') fragrancePct = log.fragrance_load_percent;

                // Ensure the candle name defaults to the blend name (if present)
                if (log.blend_id) {
                    const { data: blend } = await supabase.from('blends').select('*').eq('id', log.blend_id).maybeSingle();
                    if (blend) {
                        fragranceName = blend.name || fragranceName;
                        candleName = blend.name || candleName;

                        const addNoteScent = (scentId, noteType) => {
                            if (!scentId) return;
                            const e = essences.find(x => x.id === scentId);
                            if (!e) return;
                            selectedEssences.push({
                                id: e.id,
                                name: e.name,
                                family_name: familiesMap[e.family_id] || '',
                                family_id: e.family_id,
                                note_type: noteType
                            });
                        };

                        addNoteScent(blend.head_scent_id, 'head');
                        addNoteScent(blend.heart_scent_id, 'heart');
                        addNoteScent(blend.base_scent_id, 'base');
                    }
                }
            }
        } catch (e) {
            console.warn('[LAB] Unable to load candle for editing', e);
        }
    }

    const stepContent = document.createElement('div');
    stepContent.className = 'lab-content';
    wrapper.appendChild(stepContent);

    function renderStep() {
        stepContent.innerHTML = '';
        // Salva stato ad ogni render
        saveStateToStore();
        
        window.onTopBackClicked = () => {
            if (currentStep > 0) {
                currentStep--;
                saveStateToStore();
                renderStep();
            } else {
                // Resetta wizard quando si esce
                Store.resetWizard();
                window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
            }
        };
        switch (currentStep) {
            case 0: renderStep1(); break;
            case 1: renderStep2(); break;
            case 2: renderStep3(); break;
        }
    }

    // ========================
    // STEP 1: Scegli stampo + cera
    // ========================
    function renderStep1() {
        const step = document.createElement('div');
        step.className = 'lab-step';

        // Mold section
        const moldH = document.createElement('h3');
        moldH.className = 'lab-section-title';
        moldH.textContent = 'Scegli lo stampo';
        step.appendChild(moldH);

        const moldGrid = document.createElement('div');
        moldGrid.className = 'lab-grid';
        molds.forEach(m => {
            const card = document.createElement('div');
            card.className = 'lab-select-card' + (selectedMold?.id === m.id ? ' selected' : '');
            const moldImageUrl = getImageUrlFromRecord(m);
            const img = moldImageUrl
                ? `<img src="${moldImageUrl}" class="lab-card-img" alt="${m.name}">`
                : `<div class="lab-card-img placeholder"><span class="material-symbols-outlined">view_in_ar</span></div>`;
            card.innerHTML = `${img}<div class="lab-card-name">${m.name}</div><div class="lab-card-meta">Capacità: ${m.quantity_g || '—'}g</div>`;
            card.onclick = () => { selectedMold = m; saveStateToStore(); renderStep(); };
            moldGrid.appendChild(card);
        });
        step.appendChild(moldGrid);

        // Wax section
        const waxH = document.createElement('h3');
        waxH.className = 'lab-section-title';
        waxH.textContent = 'Scegli la cera';
        step.appendChild(waxH);

        const waxGrid = document.createElement('div');
        waxGrid.className = 'lab-grid';
        waxes.forEach(w => {
            const card = document.createElement('div');
            card.className = 'lab-select-card' + (selectedWax?.id === w.id ? ' selected' : '');
            card.innerHTML = `<div class="lab-card-name">${w.name}</div><div class="lab-card-meta">${w.quantity_g || '—'}g disponibili</div>`;
            card.onclick = () => { selectedWax = w; saveStateToStore(); renderStep(); };
            waxGrid.appendChild(card);
        });
        step.appendChild(waxGrid);

        // Next
        if (selectedMold && selectedWax) {
            const btn = createButton('Avanti', 'arrow_forward', 'btn-primary');
            btn.onclick = () => { currentStep = 1; saveStateToStore(); renderStep(); };
            step.appendChild(btn);
        }

        stepContent.appendChild(step);
    }

    // ========================
    // STEP 2: Scegli fragranza + percentuale
    // Logica migliorata: 1 nota testa, 1 cuore, 1 fondo
    // Colorazione dinamica per abbinamenti armonia/contrasto
    // ========================
    function renderStep2() {
        const step = document.createElement('div');
        step.className = 'lab-step';

        const fragH = document.createElement('h3');
        fragH.className = 'lab-section-title';
        fragH.textContent = 'Scegli la fragranza';
        step.appendChild(fragH);

        // Istruzioni per l'utente
        const instructionDiv = document.createElement('div');
        instructionDiv.className = 'lab-instruction';
        instructionDiv.innerHTML = `<p>Seleziona le essenze per creare la tua fragranza. Puoi scegliere:</p>
            <ul>
                <li><strong>Nota di testa</strong> - prima impressione, volatile</li>
                <li><strong>Nota di cuore</strong> - corpo della fragranza</li>
                <li><strong>Nota di fondo</strong> - persistenza, base</li>
            </ul>
            <p>Le essenze compatibili saranno evidenziate in base agli abbinamenti.</p>`;
        step.appendChild(instructionDiv);

        // --- MIX GIA USATI ---
        const mixContainer = document.createElement('div');
        mixContainer.className = 'input-group';
        mixContainer.style.marginBottom = '16px';
        mixContainer.innerHTML = '<label class="input-label">O scegli un mix esistente</label>';
        const mixSelect = document.createElement('select');
        mixSelect.className = 'input-field';
        mixSelect.innerHTML = '<option value="">-- Seleziona un mix --</option>';
        supabase.from('blends').select('*').eq('user_id', userId).order('name').then(({data}) => {
            if (data) {
                data.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.id;
                    opt.textContent = b.name;
                    mixSelect.appendChild(opt);
                });
            }
        });
        mixSelect.onchange = async () => {
            const bId = mixSelect.value;
            if(!bId) {
                selectedEssences = [];
                fragranceName = '';
                saveStateToStore();
                updateUIAfterSelection();
                return;
            }
            const {data: blend} = await supabase.from('blends').select('*').eq('id', bId).maybeSingle();
            if(!blend) return;
            
            // Mappa le essenze del blend con i loro tipi di nota corretti
            selectedEssences = [];
            if (blend.head_scent_id) {
                const ess = essences.find(e => e.id === blend.head_scent_id);
                if (ess) {
                    const famName = ess.family_id ? (familiesMap[ess.family_id] || '') : '';
                    selectedEssences.push({ 
                        id: ess.id, 
                        name: ess.name, 
                        family_name: famName, 
                        family_id: ess.family_id, 
                        note_type: 'head' 
                    });
                }
            }
            if (blend.heart_scent_id) {
                const ess = essences.find(e => e.id === blend.heart_scent_id);
                if (ess) {
                    const famName = ess.family_id ? (familiesMap[ess.family_id] || '') : '';
                    selectedEssences.push({ 
                        id: ess.id, 
                        name: ess.name, 
                        family_name: famName, 
                        family_id: ess.family_id, 
                        note_type: 'heart' 
                    });
                }
            }
            if (blend.base_scent_id) {
                const ess = essences.find(e => e.id === blend.base_scent_id);
                if (ess) {
                    const famName = ess.family_id ? (familiesMap[ess.family_id] || '') : '';
                    selectedEssences.push({ 
                        id: ess.id, 
                        name: ess.name, 
                        family_name: famName, 
                        family_id: ess.family_id, 
                        note_type: 'base' 
                    });
                }
            }
            fragranceName = blend.name;
            saveStateToStore();
            updateUIAfterSelection();
        };
        mixContainer.appendChild(mixSelect);
        step.appendChild(mixContainer);
        // --- FINE MIX GIA USATI ---

        // Filter controls
        const filterBar = document.createElement('div');
        filterBar.className = 'lab-filter-bar';

        const familyFilter = document.createElement('select');
        familyFilter.className = 'lab-filter-select';
        const famOpt0 = document.createElement('option');
        famOpt0.value = '';
        famOpt0.textContent = 'Tutte le famiglie';
        familyFilter.appendChild(famOpt0);
        const allFamilyIds = Array.from(new Set(essences.map(e => e.family_id).filter(Boolean)));
        allFamilyIds.forEach(fid => {
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
        ['head', 'heart', 'base'].forEach(n => {
            const opt = document.createElement('option');
            opt.value = n;
            opt.textContent = formatNoteType(n);
            noteFilter.appendChild(opt);
        });

        filterBar.appendChild(familyFilter);
        filterBar.appendChild(noteFilter);
        step.appendChild(filterBar);

        // Helper: calcola famiglie compatibili (armonia/contrasto)
        const getCompatibleFamilies = () => {
            const selectedFamilyIds = selectedEssences.map(e => e.family_id).filter(Boolean);
            if (selectedFamilyIds.length === 0) return { all: true, harmony: new Set(), contrast: new Set() };
            
            const harmonyFamilies = new Set(selectedFamilyIds);
            const contrastFamilies = new Set();
            
            pairings.forEach(p => {
                const isSourceSelected = selectedFamilyIds.includes(p.source_family_id);
                const isTargetSelected = selectedFamilyIds.includes(p.target_family_id);
                
                if (isSourceSelected) {
                    if (p.type === 'harmony' || p.type === 'armonia') {
                        harmonyFamilies.add(p.target_family_id);
                    } else if (p.type === 'contrast' || p.type === 'contrasto') {
                        contrastFamilies.add(p.target_family_id);
                    } else {
                        // Se non specificato, considera come armonia
                        harmonyFamilies.add(p.target_family_id);
                    }
                }
                if (isTargetSelected) {
                    if (p.type === 'harmony' || p.type === 'armonia') {
                        harmonyFamilies.add(p.source_family_id);
                    } else if (p.type === 'contrast' || p.type === 'contrasto') {
                        contrastFamilies.add(p.source_family_id);
                    } else {
                        harmonyFamilies.add(p.source_family_id);
                    }
                }
            });
            
            return { all: false, harmony: harmonyFamilies, contrast: contrastFamilies };
        };

        // Helper: determina quali tipi di nota sono già usati
        const getUsedNotes = () => {
            return new Set(selectedEssences.map(e => e.note_type).filter(Boolean));
        };

        // Riepilogo selezione corrente
        const selectionSummary = document.createElement('div');
        selectionSummary.className = 'lab-selection-summary';
        step.appendChild(selectionSummary);

        const updateSelectionSummary = () => {
            const usedNotes = getUsedNotes();
            // Permette multiple note di testa
            const headEss = selectedEssences.filter(e => e.note_type === 'head');
            const heartEss = selectedEssences.find(e => e.note_type === 'heart');
            const baseEss = selectedEssences.find(e => e.note_type === 'base');
            
            const headNames = headEss.length > 0 ? headEss.map(e => e.name).join(', ') : '(non selezionata)';
            
            selectionSummary.innerHTML = `
                <div class="selection-row ${headEss.length > 0 ? 'filled' : 'empty'}">
                    <span class="note-label">Testa:</span> 
                    <span class="note-value">${headNames}</span>
                </div>
                <div class="selection-row ${heartEss ? 'filled' : 'empty'}">
                    <span class="note-label">Cuore:</span> 
                    <span class="note-value">${heartEss ? heartEss.name : '(non selezionata)'}</span>
                </div>
                <div class="selection-row ${baseEss ? 'filled' : 'empty'}">
                    <span class="note-label">Fondo:</span> 
                    <span class="note-value">${baseEss ? baseEss.name : '(non selezionata)'}</span>
                </div>
            `;
        };
        updateSelectionSummary();

        const essGrid = document.createElement('div');
        essGrid.className = 'lab-grid';

        // Funzione helper per aggiornare tutta la UI dopo una selezione
        function updateUIAfterSelection() {
            updateSelectionSummary();
            buildEssenceCards();
            updateWarning();
            updateNavigationButtons();
        }

        function buildEssenceCards() {
            essGrid.innerHTML = '';
            const familyVal = familyFilter.value;
            const noteVal = noteFilter.value;
            const usedNotes = getUsedNotes();
            const compatibility = getCompatibleFamilies();

            essences.forEach(e => {
                const noteType = e.tech_data?.note_type || '';
                const famId = e.family_id || '';
                const famName = famId ? (familiesMap[famId] || '') : '';

                // Filtri UI
                if (familyVal && famId !== familyVal) return;
                if (noteVal && noteType !== noteVal) return;

                const isSel = selectedEssences.some(se => se.id === e.id);
                
                // Verifica se la nota è già usata
                // NOTA: Le note di testa possono essere multiple, cuore e fondo sono singole
                const isNoteUsed = noteType && noteType !== 'head' && usedNotes.has(noteType) && !isSel;
                
                // Verifica compatibilità famiglia
                let familyStatus = 'compatible'; // 'compatible', 'harmony', 'contrast', 'incompatible'
                if (!compatibility.all && famId) {
                    if (compatibility.harmony.has(famId)) {
                        familyStatus = 'harmony';
                    } else if (compatibility.contrast.has(famId)) {
                        familyStatus = 'contrast';
                    } else if (selectedEssences.length > 0) {
                        familyStatus = 'incompatible';
                    }
                }

                const isDisabled = isNoteUsed || familyStatus === 'incompatible';

                const card = document.createElement('div');
                let cardClass = 'lab-select-card';
                if (isSel) cardClass += ' selected';
                if (isDisabled) cardClass += ' disabled';
                if (!isDisabled && familyStatus === 'harmony') cardClass += ' harmony';
                if (!isDisabled && familyStatus === 'contrast') cardClass += ' contrast';
                card.className = cardClass;
                
                // Aggiungi badge per tipo di nota
                const noteBadge = noteType ? `<span class="note-badge note-${noteType}">${formatNoteType(noteType)}</span>` : '';
                const familyBadge = familyStatus !== 'compatible' && !isSel ? 
                    `<span class="family-badge family-${familyStatus}">${familyStatus === 'harmony' ? '♥ armonia' : familyStatus === 'contrast' ? '⚡ contrasto' : ''}</span>` : '';
                
                card.innerHTML = `
                    <div class="lab-card-name">${e.name}</div>
                    <div class="lab-card-meta">${famName ? 'Famiglia: ' + famName : ''}</div>
                    <div class="lab-card-badges">${noteBadge}${familyBadge}</div>
                `;
                
                card.onclick = () => {
                    if (isDisabled) return;
                    if (isSel) {
                        selectedEssences = selectedEssences.filter(se => se.id !== e.id);
                    } else {
                        selectedEssences.push({ 
                            id: e.id, 
                            name: e.name, 
                            family_name: famName, 
                            family_id: famId, 
                            note_type: noteType 
                        });
                    }
                    mixSelect.value = '';
                    fragranceName = '';
                    saveStateToStore();
                    updateUIAfterSelection();
                };
                essGrid.appendChild(card);
            });
        }

        familyFilter.onchange = () => buildEssenceCards();
        noteFilter.onchange = () => buildEssenceCards();

        step.appendChild(essGrid);
        buildEssenceCards();

        // Fragrance percentage
        const pctH = document.createElement('h3');
        pctH.className = 'lab-section-title';
        pctH.textContent = 'Percentuale di fragranza';
        step.appendChild(pctH);

        const pctVal = document.createElement('div');
        pctVal.className = 'lab-pct-value';
        pctVal.textContent = `${fragrancePct}%`;
        step.appendChild(pctVal);

        // Info - FORMULA CORRETTA:
        // x = capacità stampo (in acqua)
        // y = cera da sciogliere = x × wax_conversion_factor (fisso)
        // z = fragranza = y × fragrancePct / 100
        const infoDiv = document.createElement('div');
        infoDiv.className = 'lab-calc-info';
        
        const updateInfo = () => {
            if (selectedMold && selectedWax) {
                const cap = selectedMold.quantity_g || 100;
                // Costante di conversione della cera (da tech_data o default 0.90)
                const waxFactor = selectedWax.tech_data?.conversion_factor || 0.90;
                const waxAmt = Math.round(cap * waxFactor);
                const fragAmt = Math.round(waxAmt * fragrancePct / 100);
                infoDiv.innerHTML = `<p>Cera da sciogliere: <strong>${waxAmt}g</strong> (fisso)</p><p>Fragranza da aggiungere: <strong>${fragAmt}g</strong> (${fragrancePct}% della cera)</p>`;
            } else if (selectedMold) {
                const cap = selectedMold.quantity_g || 100;
                const waxAmt = Math.round(cap * 0.90);
                const fragAmt = Math.round(waxAmt * fragrancePct / 100);
                infoDiv.innerHTML = `<p>Cera da sciogliere: <strong>${waxAmt}g</strong> (fisso)</p><p>Fragranza da aggiungere: <strong>${fragAmt}g</strong> (${fragrancePct}% della cera)</p>`;
            }
        };
        updateInfo();
        step.appendChild(infoDiv);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '5';
        slider.max = '12';
        slider.value = String(Math.max(5, Math.min(12, fragrancePct)));
        slider.oninput = (ev) => { 
            fragrancePct = parseInt(ev.target.value); 
            pctVal.textContent = `${fragrancePct}%`; 
            saveStateToStore();
            updateInfo();
        };
        step.insertBefore(slider, infoDiv);

        // Avviso se meno di 3 essenze
        const warningDiv = document.createElement('div');
        warningDiv.className = 'lab-warning';
        step.appendChild(warningDiv);

        const updateWarning = () => {
            const count = selectedEssences.length;
            if (count > 0 && count < 3) {
                warningDiv.innerHTML = `<p>⚠️ Hai selezionato solo ${count} essenz${count === 1 ? 'a' : 'e'}. Per una fragranza completa, seleziona 1 nota di testa, 1 di cuore e 1 di fondo.</p>`;
                warningDiv.style.display = 'block';
            } else {
                warningDiv.style.display = 'none';
            }
        };

        // Nav buttons
        const btns = document.createElement('div');
        btns.className = 'btn-container';
        const backBtn = createButton('Indietro', 'arrow_back', 'btn-secondary');
        backBtn.onclick = () => { currentStep = 0; saveStateToStore(); renderStep(); };
        btns.appendChild(backBtn);
        
        const updateNavigationButtons = () => {
            // Rimuovi il bottone Avanti se esiste
            const existingNextBtn = btns.querySelector('[data-btn="next"]');
            if (existingNextBtn) existingNextBtn.remove();
            
            // Aggiungi il bottone Avanti se ci sono essenze selezionate
            if (selectedEssences.length > 0) {
                const nextBtn = createButton('Avanti', 'arrow_forward', 'btn-primary');
                nextBtn.setAttribute('data-btn', 'next');
                nextBtn.onclick = () => { currentStep = 2; saveStateToStore(); renderStep(); };
                btns.appendChild(nextBtn);
            }
        };
        
        updateWarning();
        updateNavigationButtons();
        step.appendChild(btns);
        stepContent.appendChild(step);
    }

    // ========================
    // STEP 3: Risultato + salvataggio
    // ========================
    function renderStep3() {
        const step = document.createElement('div');
        step.className = 'lab-step';

        const resH = document.createElement('h3');
        resH.className = 'lab-section-title';
        resH.textContent = 'Candela risultante';
        step.appendChild(resH);

        // FORMULA CORRETTA:
        // x = capacità stampo (in acqua)
        // y = cera da sciogliere = x × wax_conversion_factor (fisso)
        // z = fragranza = y × fragrancePct / 100
        const cap = selectedMold?.quantity_g || 100;
        const waxFactor = selectedWax?.tech_data?.conversion_factor || 0.90;
        const waxAmt = Math.round(cap * waxFactor);
        const fragAmt = Math.round(waxAmt * fragrancePct / 100);

        // Distribute fragrance grams by note type (head/heart/base) using approx ratios 25/50/25
        const noteRatios = { head: 0.25, heart: 0.5, base: 0.25 };
        const selectedByNote = {
            head: selectedEssences.filter(e => e.note_type === 'head'),
            heart: selectedEssences.filter(e => e.note_type === 'heart'),
            base: selectedEssences.filter(e => e.note_type === 'base')
        };

        // If some note types are missing, renormalize the ratios so they sum to 1 for the available types.
        const availableTypes = Object.entries(selectedByNote)
            .filter(([, arr]) => arr.length > 0)
            .map(([type]) => type);
        let normalizedRatios = { ...noteRatios };
        if (availableTypes.length > 0 && availableTypes.length < 3) {
            const total = availableTypes.reduce((sum, type) => sum + noteRatios[type], 0);
            normalizedRatios = availableTypes.reduce((acc, type) => {
                acc[type] = noteRatios[type] / total;
                return acc;
            }, {});
        }

        const ingredientsLines = [];
        availableTypes.forEach(type => {
            const essInType = selectedByNote[type];
            const typeTotal = Math.round(fragAmt * (normalizedRatios[type] || 0));
            const perEssType = essInType.length > 0 ? Math.round((typeTotal / essInType.length) * 10) / 10 : 0;
            essInType.forEach(e => {
                ingredientsLines.push(`${e.name} ${perEssType}g`);
            });
        });

        const recipe = document.createElement('div');
        recipe.className = 'recipe-card';
        recipe.innerHTML = `
            <h3>${candleName || defaultCandleName || 'Candela'}</h3>
            <div class="recipe-section"><h4>Stampo</h4><p>${selectedMold?.name || '—'}</p></div>
            <div class="recipe-section"><h4>Capacità stampo</h4><p class="recipe-amount">${cap}g</p></div>
            <div class="recipe-section"><h4>Cera da sciogliere</h4><p>${selectedWax?.name || '—'}: <strong>${waxAmt}g</strong> (fisso)</p></div>
            <div class="recipe-section"><h4>Fragranza da aggiungere</h4><p><strong>${fragAmt}g</strong> (${fragrancePct}% della cera)</p></div>
            <div class="recipe-section"><h4>Ingredienti</h4><p>${ingredientsLines.join(', ') || '—'}</p></div>
            <div class="recipe-section"><h4>Famiglia</h4><p>${selectedEssences.map(e => e.family_name).filter(Boolean).join(', ') || '—'}</p></div>
        `;
        step.appendChild(recipe);

        // Name input
        const nameGrp = document.createElement('div');
        nameGrp.className = 'input-group';
        nameGrp.innerHTML = `<label class="input-label">Nome candela</label><input class="input-field" type="text" placeholder="Candela 1">`;
        const nameInput = nameGrp.querySelector('input');
        nameInput.value = candleName || defaultCandleName;
        nameInput.oninput = (e) => { candleName = e.target.value; };
        step.appendChild(nameGrp);

        // Fragrance name (editable)
        const fragGrp = document.createElement('div');
        fragGrp.className = 'input-group';
        fragGrp.innerHTML = `<label class="input-label">Nome fragranza</label><input class="input-field" type="text" placeholder="Nome della fragranza">`;
        const fragInput = fragGrp.querySelector('input');
        fragInput.value = fragranceName || selectedEssences.map(e => e.name).join(', ');
        fragInput.oninput = (e) => { fragranceName = e.target.value; };
        step.appendChild(fragGrp);

        // Fragrance family (auto-derived, read-only)
        const noteGrp = document.createElement('div');
        noteGrp.className = 'input-group';
        noteGrp.innerHTML = `<label class="input-label">Famiglia della fragranza</label><input class="input-field" type="text" readonly>`;
        const noteInput = noteGrp.querySelector('input');
        const autoFamily = computeFragranceFamily();
        fragranceFamily = autoFamily;
        noteInput.value = autoFamily;
        step.appendChild(noteGrp);

        const candleNotesGrp = document.createElement('div');
        candleNotesGrp.className = 'input-group';
        candleNotesGrp.innerHTML = `<label class="input-label">Note aggiuntive (opzionali)</label><textarea class="input-field" rows="3" placeholder="Es. colata a 60°..."></textarea>`;
        const candleNotesInput = candleNotesGrp.querySelector('textarea');
        // Let's clean up existing notes if editing log
        let existingNotes = editingLog?.notes || '';
        if (existingNotes) {
            existingNotes = existingNotes.replace(/.*Famiglia: [^-]+ - Note: /g, '');
            existingNotes = existingNotes.replace(/.*Fragranza: [^-]+ - Note: /g, '');
        }
        candleNotesInput.value = existingNotes.includes(' - ') ? existingNotes.split(' - ').slice(-1)[0].replace('Note: ', '') : existingNotes;
        step.appendChild(candleNotesGrp);

        // Buttons
        const btns = document.createElement('div');
        btns.className = 'btn-container';
        const backBtn = createButton('Indietro', 'arrow_back', 'btn-secondary');
        backBtn.onclick = () => { currentStep = 1; saveStateToStore(); renderStep(); };
        btns.appendChild(backBtn);
        const saveBtn = createButton('Salva candela', 'save', 'btn-primary');
        saveBtn.onclick = async () => {
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id;
            if (!userId) { alert('Devi essere loggato!'); return; }

            // Determine batch number.
            // When editing, keep the original batch number; otherwise compute a new one.
            let batchNumber = editingLog?.batch_number || 1;
            if (!editingLog) {
                try {
                    const { data: lastBatch, error: batchError } = await supabase
                        .from('candle_log')
                        .select('batch_number')
                        .eq('user_id', userId)
                        .order('batch_number', { ascending: false })
                        .limit(1);

                    if (!batchError && lastBatch && lastBatch.length > 0) {
                        const raw = lastBatch[0].batch_number;
                        const parsed = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
                        if (!Number.isNaN(parsed)) {
                            batchNumber = parsed + 1;
                        } else if (typeof raw === 'number') {
                            batchNumber = raw + 1;
                        }
                    }
                } catch (e) {
                    console.warn('[LAB] Unable to compute next batch number, defaulting to 1', e);
                }
            }

            // Create or update a blend record matching the selected essences
            const blendName = (candleName || '').trim() || `Candela ${batchNumber}`;
            
            // Assegna correttamente le essenze per tipo di nota
            const headEss = selectedEssences.find(e => e.note_type === 'head');
            const heartEss = selectedEssences.find(e => e.note_type === 'heart');
            const baseEss = selectedEssences.find(e => e.note_type === 'base');
            
            const headScentId = headEss?.id || null;
            const heartScentId = heartEss?.id || null;
            const baseScentId = baseEss?.id || null;

            const familyCounts = {};
            selectedEssences.forEach(e => {
                if (e.family_id) familyCounts[e.family_id] = (familyCounts[e.family_id] || 0) + 1;
            });
            const resultingFamilyId = Object.entries(familyCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([fam]) => fam)[0] || null;

            let blendId = editingLog?.blend_id || null;
            if (blendId) {
                const { error: blendError } = await supabase.from('blends').update({
                    user_id: userId,
                    name: blendName,
                    head_scent_id: headScentId,
                    heart_scent_id: heartScentId,
                    base_scent_id: baseScentId,
                    resulting_family_id: resultingFamilyId
                }).eq('id', blendId);
                if (blendError) {
                    alert(`Errore nell${editingLog ? ' aggiornamento' : ' creazione'} del blend: ${blendError.message}`);
                    return;
                }
            } else {
                const { data: blendData, error: blendError } = await supabase.from('blends').insert([{
                    user_id: userId,
                    name: blendName,
                    head_scent_id: headScentId,
                    heart_scent_id: heartScentId,
                    base_scent_id: baseScentId,
                    resulting_family_id: resultingFamilyId
                }]).select('id').single();

                if (blendError) {
                    alert('Errore nella creazione del blend: ' + blendError.message);
                    return;
                }

                blendId = blendData?.id;
            }

            const notes = candleNotesInput ? candleNotesInput.value.trim() : '';

            const logPayload = {
                user_id: userId,
                mold_id: selectedMold?.id,
                wax_id: selectedWax?.id,
                blend_id: blendId,
                total_wax_used: waxAmt,
                fragrance_load_percent: fragrancePct,
                notes,
                batch_number: batchNumber
            };

            let error;
            if (editingLog && editingLog.id) {
                // Update existing log
                const res = await supabase.from('candle_log').update(logPayload).eq('id', editingLog.id);
                error = res.error;
            } else {
                // Create new log
                const res = await supabase.from('candle_log').insert([logPayload]);
                error = res.error;
            }

            if (error) {
                alert('Errore: ' + error.message);
            } else {
                // Only decrement wax stock on new creations, not on edits
                if (!editingLog) {
                    try {
                        const usedWax = waxAmt;
                        const currentQty = parseFloat(selectedWax?.quantity_g) || 0;
                        const newQty = Math.max(0, currentQty - usedWax);
                        await supabase.from('inventory').update({ quantity_g: newQty }).eq('id', selectedWax?.id);
                    } catch (e) {
                        console.warn('[LAB] Could not update wax stock', e);
                    }
                }

                // Reset wizard state dopo il salvataggio
                Store.resetWizard();
                
                alert('Candela salvata!');
                window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
            }
        };
        btns.appendChild(saveBtn);
        step.appendChild(btns);
        stepContent.appendChild(step);
    }

    renderStep();
    container.appendChild(wrapper);
}
