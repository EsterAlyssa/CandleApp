// ===================================================
// EDIT_BLEND.JS - Vista per modificare un mix/blend esistente
// ===================================================

import { supabase } from '../supabase.js';
import { createButton, createTitle } from '../components.js?v=3';

export async function renderEditBlend(container, blendId) {
    console.log('[VIEW] Rendering EditBlend...', blendId);
    container.innerHTML = '';

    const isCreating = !blendId;

    const wrapper = document.createElement('div');
    wrapper.className = 'lab-wrapper';

    const title = createTitle(isCreating ? 'Crea nuovo Mix' : 'Modifica Mix', 2);
    title.classList.add('page-title');
    wrapper.appendChild(title);

    // --- Current user ---
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
        wrapper.innerHTML = '<p class="error-text">Devi essere loggato per creare/modificare un mix.</p>';
        container.appendChild(wrapper);
        return;
    }

    // --- Fetch blend data (if editing) ---
    let blend = null;
    if (!isCreating) {
        const { data: blendData, error: blendError } = await supabase
            .from('blends')
            .select('*')
            .eq('id', blendId)
            .maybeSingle();

        if (blendError || !blendData) {
            wrapper.innerHTML = '<p class="error-text">Mix non trovato.</p>';
            container.appendChild(wrapper);
            return;
        }
        blend = blendData;
    }

    // --- Fetch essences and families ---
    const [essencesRes, familiesRes, pairingsRes] = await Promise.all([
        supabase.from('inventory').select('id, name, family_id, tech_data').eq('category', 'scent').eq('user_id', userId).order('name'),
        supabase.from('families').select('*'),
        supabase.from('family_pairings').select('source_family_id, target_family_id, type')
    ]);

    const essences = essencesRes.data || [];
    const familiesMap = {};
    (familiesRes.data || []).forEach(f => { familiesMap[f.id] = f.name_it || f.name || ''; });
    const pairings = pairingsRes.data || [];

    // --- State ---
    let selectedEssences = [];
    let fragranceName = blend?.name || '';

    // Pre-populate selected essences from blend (only if editing)
    if (blend) {
        const loadEssenceById = (id, noteType) => {
            if (!id) return;
            const ess = essences.find(e => e.id === id);
            if (ess) {
                const famName = ess.family_id ? (familiesMap[ess.family_id] || '') : '';
                selectedEssences.push({
                    id: ess.id,
                    name: ess.name,
                    family_name: famName,
                    family_id: ess.family_id,
                    note_type: noteType
                });
            }
        };

        loadEssenceById(blend.head_scent_id, 'head');
        loadEssenceById(blend.heart_scent_id, 'heart');
        loadEssenceById(blend.base_scent_id, 'base');
    }

    // --- Helpers ---
    const formatNoteType = (nt) => {
        if (nt === 'head') return 'Testa';
        if (nt === 'heart') return 'Cuore';
        if (nt === 'base') return 'Fondo';
        return nt;
    };

    const getUsedNotes = () => {
        return new Set(selectedEssences.map(e => e.note_type).filter(Boolean));
    };

    const getCompatibleFamilies = () => {
        if (selectedEssences.length === 0) {
            return { all: true, harmony: new Set(), contrast: new Set() };
        }
        const selectedFamIds = selectedEssences.map(e => e.family_id).filter(Boolean);
        const harmony = new Set();
        const contrast = new Set();

        pairings.forEach(p => {
            if (selectedFamIds.includes(p.source_family_id)) {
                if (p.type === 'harmony') harmony.add(p.target_family_id);
                else if (p.type === 'contrast') contrast.add(p.target_family_id);
            }
            if (selectedFamIds.includes(p.target_family_id)) {
                if (p.type === 'harmony') harmony.add(p.source_family_id);
                else if (p.type === 'contrast') contrast.add(p.source_family_id);
            }
        });

        selectedFamIds.forEach(fid => {
            harmony.add(fid);
            contrast.add(fid);
        });

        return { all: false, harmony, contrast };
    };

    const computeFragranceFamily = () => {
        const famCounts = {};
        selectedEssences.forEach(e => {
            if (e.family_name) {
                famCounts[e.family_name] = (famCounts[e.family_name] || 0) + 1;
            }
        });
        let maxFam = '';
        let maxCount = 0;
        Object.entries(famCounts).forEach(([fam, cnt]) => {
            if (cnt > maxCount) { maxCount = cnt; maxFam = fam; }
        });
        return maxFam;
    };

    // --- Selection Summary ---
    const selectionSummary = document.createElement('div');
    selectionSummary.className = 'lab-selection-summary';
    wrapper.appendChild(selectionSummary);

    const updateSelectionSummary = () => {
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

    // --- Filter Bar ---
    const filterBar = document.createElement('div');
    filterBar.className = 'lab-filter-bar';

    const familyFilter = document.createElement('select');
    familyFilter.className = 'lab-filter-select';
    const famOpt0 = document.createElement('option');
    famOpt0.value = '';
    famOpt0.textContent = 'Tutte le famiglie';
    familyFilter.appendChild(famOpt0);
    const familyIds = Array.from(new Set(essences.map(e => e.family_id).filter(Boolean)));
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
    ['head', 'heart', 'base'].forEach(nt => {
        const opt = document.createElement('option');
        opt.value = nt;
        opt.textContent = formatNoteType(nt);
        noteFilter.appendChild(opt);
    });

    filterBar.appendChild(familyFilter);
    filterBar.appendChild(noteFilter);
    wrapper.appendChild(filterBar);

    // --- Essence Grid ---
    const essGrid = document.createElement('div');
    essGrid.className = 'lab-grid';

    function updateUI() {
        updateSelectionSummary();
        buildEssenceCards();
        updateWarning();
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

            if (familyVal && famId !== familyVal) return;
            if (noteVal && noteType !== noteVal) return;

            const isSel = selectedEssences.some(se => se.id === e.id);
            const isNoteUsed = noteType && noteType !== 'head' && usedNotes.has(noteType) && !isSel;

            let familyStatus = 'compatible';
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
                updateUI();
            };
            essGrid.appendChild(card);
        });
    }

    familyFilter.onchange = () => buildEssenceCards();
    noteFilter.onchange = () => buildEssenceCards();

    wrapper.appendChild(essGrid);
    buildEssenceCards();

    // --- Warning ---
    const warningDiv = document.createElement('div');
    warningDiv.className = 'lab-warning';
    wrapper.appendChild(warningDiv);

    const updateWarning = () => {
        const count = selectedEssences.length;
        if (count > 0 && count < 3) {
            warningDiv.innerHTML = `<p>⚠️ Hai selezionato solo ${count} essenz${count === 1 ? 'a' : 'e'}. Per una fragranza completa, seleziona 1 nota di testa, 1 di cuore e 1 di fondo.</p>`;
            warningDiv.style.display = 'block';
        } else {
            warningDiv.style.display = 'none';
        }
    };
    updateWarning();

    // --- Name Input ---
    const nameGrp = document.createElement('div');
    nameGrp.className = 'input-group';
    nameGrp.innerHTML = `<label class="input-label">Nome del mix</label><input class="input-field" type="text" placeholder="Nome del mix">`;
    const nameInput = nameGrp.querySelector('input');
    nameInput.value = fragranceName;
    nameInput.oninput = (e) => { fragranceName = e.target.value; };
    wrapper.appendChild(nameGrp);

    // --- Buttons ---
    const btns = document.createElement('div');
    btns.className = 'btn-container';

    const backBtn = createButton('Annulla', 'arrow_back', 'outline');
    backBtn.onclick = () => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
    };
    btns.appendChild(backBtn);

    const saveBtn = createButton(isCreating ? 'Crea Mix' : 'Salva modifiche', 'save', 'primary lg');
    saveBtn.onclick = async () => {
        if (selectedEssences.length === 0) {
            alert('Seleziona almeno un\'essenza.');
            return;
        }

        // Support multiple head notes - take first one for head_scent_id
        const headEssences = selectedEssences.filter(e => e.note_type === 'head');
        const heartEss = selectedEssences.find(e => e.note_type === 'heart');
        const baseEss = selectedEssences.find(e => e.note_type === 'base');

        const resultingFamily = computeFragranceFamily();
        const resultingFamilyId = Object.entries(familiesMap).find(([id, name]) => name === resultingFamily)?.[0] || null;

        // Note: blends table doesn't have tech_data column (only inventory has it)
        // For multiple head notes, we store only the first one in head_scent_id
        // Additional head notes can be tracked in a separate junction table if needed

        const blendData = {
            name: fragranceName || 'Mix senza nome',
            head_scent_id: headEssences[0]?.id || null,
            heart_scent_id: heartEss?.id || null,
            base_scent_id: baseEss?.id || null,
            resulting_family_id: resultingFamilyId,
            user_id: userId
        };

        let error;
        if (isCreating) {
            // INSERT new blend
            const result = await supabase.from('blends').insert([blendData]);
            error = result.error;
        } else {
            // UPDATE existing blend
            const result = await supabase.from('blends').update(blendData).eq('id', blendId);
            error = result.error;
        }

        if (error) {
            alert('Errore nel salvataggio: ' + error.message);
        } else {
            alert(isCreating ? 'Mix creato con successo!' : 'Mix aggiornato con successo!');
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
        }
    };
    btns.appendChild(saveBtn);

    wrapper.appendChild(btns);
    container.appendChild(wrapper);
}
