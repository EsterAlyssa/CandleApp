// ===================================================
// PAIRINGS.JS - Abbinamenti per famiglia/essenza
// ===================================================

import { createTitle, createButton } from '../components.js?v=3';

export async function renderPairings(container, familyId) {
    console.log('[VIEW] Rendering Pairings for', familyId);
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'inventory-wrapper';

    const title = createTitle('Abbinamenti', 2);
    title.classList.add('page-title');
    wrapper.appendChild(title);

    let essenceName = '';
    let resolvedFamilyId = familyId;

    // Helper per le fetch API
    const fetchApi = async (url) => {
        try { const r = await fetch(url); return r.ok ? await r.json() : []; } 
        catch (e) { return []; }
    };

    // PONTE 1: Se familyId è un ID essenza, ricava il nome e la family_id
    if (familyId) {
        const invData = await fetchApi(`/api/inventory?id=${familyId}`);
        if (invData && invData.length > 0) {
            const invItem = invData[0];
            essenceName = invItem.name;
            resolvedFamilyId = invItem.family_id || familyId;
        }
    }

    // PONTE 2: Nome della famiglia
    let familyName = '';
    if (resolvedFamilyId) {
        const famData = await fetchApi(`/api/families?ids=${resolvedFamilyId}`);
        if (famData && famData.length > 0) {
            familyName = famData[0].name_it || '';
        }
    }

    // Header essenza/famiglia
    if (essenceName || familyName) {
        const headerEl = document.createElement('h3');
        headerEl.className = 'pairings-essence-name';
        headerEl.textContent = essenceName ? `Essenza: ${essenceName}` : `Famiglia: ${familyName}`;
        wrapper.appendChild(headerEl);
    }

    // PONTE 3: Fetch pairings
    const pairings = await fetchApi(`/api/pairings?family_id=${resolvedFamilyId}`);

    if (!pairings || pairings.length === 0) {
        const emptyP = document.createElement('p');
        emptyP.className = 'empty-text';
        emptyP.textContent = 'Nessun abbinamento trovato per questa famiglia.';
        wrapper.appendChild(emptyP);
    } else {
        const targetIds = [...new Set(pairings.map(p => p.source_family_id === resolvedFamilyId ? p.target_family_id : p.source_family_id))];
        
        // PONTE 4: Nomi delle famiglie target
        const targetFams = await fetchApi(`/api/families?ids=${targetIds.join(',')}`);
        const famMap = {};
        (targetFams || []).forEach(f => { famMap[f.id] = f.name_it || f.id; });

        // PONTE 5: Essenze per ogni famiglia target
        const targetEssences = await fetchApi(`/api/inventory?category=scent&family_ids=${targetIds.join(',')}`);
        const essByFam = {};
        (targetEssences || []).forEach(e => {
            if (!essByFam[e.family_id]) essByFam[e.family_id] = [];
            essByFam[e.family_id].push(e.name);
        });

        const typeOf = (p) => String(p.type || '').toLowerCase();
        const harmony = pairings.filter(p => typeOf(p) === 'armonia' || typeOf(p) === 'harmony');
        const contrast = pairings.filter(p => typeOf(p) === 'contrasto' || typeOf(p) === 'contrast');

        function renderSection(label, icon, kind, items) {
            const section = document.createElement('div');
            section.className = `pairing-section pairing-${kind}`;
            const h4 = document.createElement('h4');
            h4.className = 'pairing-section-title';
            h4.textContent = `${icon} ${label}`;
            section.appendChild(h4);

            const seen = new Set();
            items.forEach(p => {
                const targetId = p.source_family_id === resolvedFamilyId ? p.target_family_id : p.source_family_id;
                if (seen.has(targetId)) return;
                seen.add(targetId);
                const famN = famMap[targetId] || targetId;
                const essNames = essByFam[targetId] || [];
                const row = document.createElement('div');
                row.className = 'pairing-row';
                const chips = essNames.map(n => `<span class="pairing-chip">${n}</span>`).join('');
                row.innerHTML = `<div class="pairing-family">${famN}</div>${chips ? `<div class="pairing-essences">${chips}</div>` : ''}`;
                section.appendChild(row);
            });

            return section;
        }

        if (harmony.length > 0) wrapper.appendChild(renderSection('Per armonia', '♥', 'harmony', harmony));
        if (contrast.length > 0) wrapper.appendChild(renderSection('Per contrasto', '⚡', 'contrast', contrast));

        if (harmony.length === 0 && contrast.length === 0 && pairings.length > 0) {
            const debugSection = document.createElement('div');
            debugSection.className = 'pairing-section';
            const h4 = document.createElement('h4');
            h4.textContent = 'Altri abbinamenti (tipo non riconosciuto):';
            debugSection.appendChild(h4);
            pairings.forEach(p => {
                const targetId = p.source_family_id === resolvedFamilyId ? p.target_family_id : p.source_family_id;
                const famN = famMap[targetId] || targetId;
                const row = document.createElement('div');
                row.className = 'pairing-row';
                row.innerHTML = `<strong>${p.type || '??'}:</strong> ${famN}`;
                debugSection.appendChild(row);
            });
            wrapper.appendChild(debugSection);
        }
    }

    const backBtn = createButton('Torna al magazzino', 'arrow_back', 'btn-primary');
    backBtn.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
    wrapper.appendChild(backBtn);

    container.appendChild(wrapper);
}