// ===================================================
// LAB.JS - Wizard Creazione Candela (multi-step)
// ===================================================

import { supabase } from '../supabase.js';
import { createButton, createTitle } from '../components.js?v=3';

export async function renderLab(container) {
    console.log('[VIEW] Rendering Lab...');
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'lab-wrapper';

    const title = createTitle('Crea una candela', 2);
    title.classList.add('page-title');
    wrapper.appendChild(title);

    // --- State ---
    let currentStep = 0;
    let selectedMold = null;
    let selectedWax = null;
    let selectedEssences = [];
    let fragrancePct = 8;
    let candleName = '';
    let fragranceName = '';
    let fragranceNote = '';

    // --- Fetch data ---
    const [moldsRes, waxesRes, essencesRes, familiesRes] = await Promise.all([
        supabase.from('inventory').select('*').eq('category', 'Stampi').order('name'),
        supabase.from('inventory').select('*').eq('category', 'Cere').order('name'),
        supabase.from('inventory').select('*').eq('category', 'Essenze').order('name'),
        supabase.from('families').select('*')
    ]);
    const molds = moldsRes.data || [];
    const waxes = waxesRes.data || [];
    const essences = essencesRes.data || [];
    const familiesMap = {};
    (familiesRes.data || []).forEach(f => { familiesMap[f.id] = f.name_it || f.name || ''; });

    const stepContent = document.createElement('div');
    stepContent.className = 'lab-content';
    wrapper.appendChild(stepContent);

    function renderStep() {
        stepContent.innerHTML = '';
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
            const img = m.image_url
                ? `<img src="${m.image_url}" class="lab-card-img" alt="${m.name}">`
                : `<div class="lab-card-img placeholder"><span class="material-symbols-outlined">view_in_ar</span></div>`;
            card.innerHTML = `${img}<div class="lab-card-name">${m.name}</div><div class="lab-card-meta">Capacità: ${m.quantity_g || '—'}g</div>`;
            card.onclick = () => { selectedMold = m; renderStep(); };
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
            card.onclick = () => { selectedWax = w; renderStep(); };
            waxGrid.appendChild(card);
        });
        step.appendChild(waxGrid);

        // Next
        if (selectedMold && selectedWax) {
            const btn = createButton('Avanti', 'arrow_forward', 'btn-primary');
            btn.onclick = () => { currentStep = 1; renderStep(); };
            step.appendChild(btn);
        }

        stepContent.appendChild(step);
    }

    // ========================
    // STEP 2: Scegli fragranza + percentuale
    // ========================
    function renderStep2() {
        const step = document.createElement('div');
        step.className = 'lab-step';

        const fragH = document.createElement('h3');
        fragH.className = 'lab-section-title';
        fragH.textContent = 'Scegli la fragranza';
        step.appendChild(fragH);

        const essGrid = document.createElement('div');
        essGrid.className = 'lab-grid';
        essences.forEach(e => {
            const isSel = selectedEssences.some(se => se.id === e.id);
            const famName = e.family_id ? (familiesMap[e.family_id] || '') : '';
            const card = document.createElement('div');
            card.className = 'lab-select-card' + (isSel ? ' selected' : '');
            card.innerHTML = `<div class="lab-card-name">${e.name}</div><div class="lab-card-meta">${famName ? 'Famiglia: ' + famName : ''}</div>`;
            card.onclick = () => {
                if (isSel) selectedEssences = selectedEssences.filter(se => se.id !== e.id);
                else selectedEssences.push({ id: e.id, name: e.name, family_name: famName, family_id: e.family_id });
                renderStep();
            };
            essGrid.appendChild(card);
        });
        step.appendChild(essGrid);

        // Fragrance percentage
        const pctH = document.createElement('h3');
        pctH.className = 'lab-section-title';
        pctH.textContent = 'Percentuale di fragranza';
        step.appendChild(pctH);

        const pctVal = document.createElement('div');
        pctVal.className = 'lab-pct-value';
        pctVal.textContent = `${fragrancePct}%`;
        step.appendChild(pctVal);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '15';
        slider.value = String(fragrancePct);
        slider.oninput = (ev) => { fragrancePct = parseInt(ev.target.value); pctVal.textContent = `${fragrancePct}%`; };
        step.appendChild(slider);

        // Info
        if (selectedMold) {
            const cap = selectedMold.quantity_g || 100;
            const waxAmt = Math.round(cap * (1 - fragrancePct / 100));
            const fragAmt = Math.round(cap * fragrancePct / 100);
            const infoDiv = document.createElement('div');
            infoDiv.className = 'lab-calc-info';
            infoDiv.innerHTML = `<p>Cera da sciogliere: <strong>${waxAmt}g</strong></p><p>Fragranza da usare: <strong>${fragAmt}g</strong> (${fragrancePct}%)</p>`;
            step.appendChild(infoDiv);
        }

        // Nav buttons
        const btns = document.createElement('div');
        btns.className = 'btn-container';
        const backBtn = createButton('Indietro', 'arrow_back', 'btn-secondary');
        backBtn.onclick = () => { currentStep = 0; renderStep(); };
        btns.appendChild(backBtn);
        if (selectedEssences.length > 0) {
            const nextBtn = createButton('Avanti', 'arrow_forward', 'btn-primary');
            nextBtn.onclick = () => { currentStep = 2; renderStep(); };
            btns.appendChild(nextBtn);
        }
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

        const cap = selectedMold?.quantity_g || 100;
        const waxAmt = Math.round(cap * (1 - fragrancePct / 100));
        const fragAmt = Math.round(cap * fragrancePct / 100);
        const perEss = selectedEssences.length > 0 ? Math.round(fragAmt / selectedEssences.length * 10) / 10 : 0;

        const recipe = document.createElement('div');
        recipe.className = 'recipe-card';
        recipe.innerHTML = `
            <h3>${candleName || 'Candela'}</h3>
            <div class="recipe-section"><h4>Stampo</h4><p>${selectedMold?.name || '—'}</p></div>
            <div class="recipe-section"><h4>Capacità stampo</h4><p class="recipe-amount">${cap}g</p></div>
            <div class="recipe-section"><h4>Cera da sciogliere</h4><p>${selectedWax?.name || '—'}: <strong>${waxAmt}g</strong></p></div>
            <div class="recipe-section"><h4>Fragranza da usare</h4><p><strong>${fragAmt}g</strong> (${fragrancePct}%)</p></div>
            <div class="recipe-section"><h4>Ingredienti</h4><p>${selectedEssences.map(e => `${e.name} ${perEss}g`).join(', ') || '—'}</p></div>
            <div class="recipe-section"><h4>Famiglia</h4><p>${selectedEssences.map(e => e.family_name).filter(Boolean).join(', ') || '—'}</p></div>
        `;
        step.appendChild(recipe);

        // Name input
        const nameGrp = document.createElement('div');
        nameGrp.className = 'input-group';
        nameGrp.innerHTML = `<label class="input-label">Nome candela</label><input class="input-field" type="text" placeholder="Candela 1">`;
        nameGrp.querySelector('input').value = candleName;
        nameGrp.querySelector('input').oninput = (e) => { candleName = e.target.value; };
        step.appendChild(nameGrp);

        // Fragrance name
        const fragGrp = document.createElement('div');
        fragGrp.className = 'input-group';
        fragGrp.innerHTML = `<label class="input-label">Nome fragranza</label><input class="input-field" type="text" placeholder="Nome della fragranza">`;
        fragGrp.querySelector('input').value = fragranceName;
        fragGrp.querySelector('input').oninput = (e) => { fragranceName = e.target.value; };
        step.appendChild(fragGrp);

        // Fragrance note
        const noteGrp = document.createElement('div');
        noteGrp.className = 'input-group';
        noteGrp.innerHTML = `<label class="input-label">Nota della fragranza</label><input class="input-field" type="text" placeholder="Nota olfattiva (es. fiorita)">`;
        noteGrp.querySelector('input').value = fragranceNote;
        noteGrp.querySelector('input').oninput = (e) => { fragranceNote = e.target.value; };
        step.appendChild(noteGrp);

        // Buttons
        const btns = document.createElement('div');
        btns.className = 'btn-container';
        const backBtn = createButton('Indietro', 'arrow_back', 'btn-secondary');
        backBtn.onclick = () => { currentStep = 1; renderStep(); };
        btns.appendChild(backBtn);
        const saveBtn = createButton('Salva candela', 'save', 'btn-primary');
        saveBtn.onclick = async () => {
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id;
            if (!userId) { alert('Devi essere loggato!'); return; }

            // Determine next batch number for this user (must be integer)
            let batchNumber = 1;
            try {
                const { data: lastBatch, error: batchError } = await supabase
                    .from('candle_log')
                    .select('batch_number')
                    .eq('user_id', userId)
                    .order('batch_number', { ascending: false })
                    .limit(1);
                if (!batchError && lastBatch && lastBatch.length > 0) {
                    batchNumber = (lastBatch[0].batch_number || 0) + 1;
                }
            } catch (e) {
                console.warn('[LAB] Unable to compute next batch number, defaulting to 1', e);
            }

            // Create (or update) a blend record matching the selected essences
            const blendName = (candleName || '').trim() || `Candela ${batchNumber}`;
            const headScentId = selectedEssences[0]?.id || null;
            const heartScentId = selectedEssences[1]?.id || null;
            const baseScentId = selectedEssences[2]?.id || null;

            const familyCounts = {};
            selectedEssences.forEach(e => {
                if (e.family_id) familyCounts[e.family_id] = (familyCounts[e.family_id] || 0) + 1;
            });
            const resultingFamilyId = Object.entries(familyCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([fam]) => fam)[0] || null;

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

            const blendId = blendData?.id;

            const { error } = await supabase.from('candle_log').insert([{
                user_id: userId,
                mold_id: selectedMold?.id,
                wax_id: selectedWax?.id,
                blend_id: blendId,
                total_wax_used: cap,
                fragrance_load_percent: fragrancePct,
                notes: `Fragranza: ${fragranceName || selectedEssences.map(e => e.name).join(', ')}. ${fragranceNote}`.trim(),
                rating: 0,
                batch_number: batchNumber,
                is_favorite: false
            }]);
            if (error) alert('Errore: ' + error.message);
            else {
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
