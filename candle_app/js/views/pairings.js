// ===================================================
// PAIRINGS.JS - Abbinamenti per famiglia/essenza
// ===================================================

import { supabase } from '../supabase.js';
import { createTitle, createButton } from '../components.js?v=3';

export async function renderPairings(container, familyId) {
    console.log('[VIEW] Rendering Pairings for', familyId);
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'inventory-wrapper';

    const title = createTitle('Abbinamenti', 2);
    title.classList.add('page-title');
    wrapper.appendChild(title);

    // Try to resolve family or essence name
    let essenceName = '';
    let resolvedFamilyId = familyId;

    // If familyId matches an inventory item, get its name and family_id
    if (familyId) {
        const { data: invItem } = await supabase.from('inventory')
            .select('name, family_id')
            .eq('id', familyId)
            .maybeSingle();
        if (invItem) {
            essenceName = invItem.name;
            resolvedFamilyId = invItem.family_id || familyId;
        }
    }

    // Try to get family name
    let familyName = '';
    if (resolvedFamilyId) {
        const { data: fam } = await supabase.from('families')
            .select('id, name_it')
            .eq('id', resolvedFamilyId)
            .maybeSingle();
        if (fam) familyName = fam.name_it || '';
    }

    // Show essence/family header
    if (essenceName || familyName) {
        const headerEl = document.createElement('h3');
        headerEl.className = 'pairings-essence-name';
        headerEl.textContent = essenceName ? `Essenza: ${essenceName}` : `Famiglia: ${familyName}`;
        wrapper.appendChild(headerEl);
    }

    // Fetch pairings
    const { data: pairings, error } = await supabase.from('family_pairings')
        .select('id, source_family_id, target_family_id, type')
        .eq('source_family_id', resolvedFamilyId);

    if (error) {
        wrapper.innerHTML += `<p>Errore: ${error.message}</p>`;
        container.appendChild(wrapper);
        return;
    }

    if (!pairings || pairings.length === 0) {
        const emptyP = document.createElement('p');
        emptyP.className = 'empty-text';
        emptyP.textContent = 'Nessun abbinamento trovato per questa famiglia.';
        wrapper.appendChild(emptyP);
    } else {
        // Resolve family names
        const targetIds = [...new Set(pairings.map(p => p.target_family_id))];
        const { data: targetFams } = await supabase.from('families')
            .select('id, name_it')
            .in('id', targetIds);
        const famMap = {};
        (targetFams || []).forEach(f => { famMap[f.id] = f.name_it || f.id; });

        // Fetch essences for each target family
        const { data: targetEssences } = await supabase.from('inventory')
            .select('name, family_id')
            .eq('category', 'scent')
            .in('family_id', targetIds);
        const essByFam = {};
        (targetEssences || []).forEach(e => {
            if (!essByFam[e.family_id]) essByFam[e.family_id] = [];
            essByFam[e.family_id].push(e.name);
        });

        // Split by type
        const harmony = pairings.filter(p => p.type === 'armonia');
        const contrast = pairings.filter(p => p.type === 'contrasto');

        function renderSection(label, items) {
            const section = document.createElement('div');
            section.className = 'pairing-section';
            const h4 = document.createElement('h4');
            h4.textContent = label;
            section.appendChild(h4);

            items.forEach(p => {
                const famN = famMap[p.target_family_id] || p.target_family_id;
                const essNames = essByFam[p.target_family_id] || [];
                const row = document.createElement('div');
                row.className = 'pairing-row';
                row.innerHTML = `<strong>${famN}</strong>${essNames.length > 0 ? '<br><span class="pairing-essences">' + essNames.join(', ') + '</span>' : ''}`;
                section.appendChild(row);
            });

            return section;
        }

        if (harmony.length > 0) wrapper.appendChild(renderSection('Per armonia:', harmony));
        if (contrast.length > 0) wrapper.appendChild(renderSection('Per contrasto:', contrast));

        if (harmony.length === 0 && contrast.length === 0 && pairings.length > 0) {
            const debugSection = document.createElement('div');
            debugSection.className = 'pairing-section';
            const h4 = document.createElement('h4');
            h4.textContent = 'Altri abbinamenti (tipo non riconosciuto):';
            debugSection.appendChild(h4);
            pairings.forEach(p => {
                const famN = famMap[p.target_family_id] || p.target_family_id;
                const row = document.createElement('div');
                row.className = 'pairing-row';
                row.innerHTML = `<strong>${p.type || '??'}:</strong> ${famN}`;
                debugSection.appendChild(row);
            });
            wrapper.appendChild(debugSection);
        }
    }

    // Back button
    const backBtn = createButton('Torna al magazzino', 'arrow_back', 'btn-primary');
    backBtn.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
    wrapper.appendChild(backBtn);

    container.appendChild(wrapper);
}
