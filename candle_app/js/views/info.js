// ===================================================
// INFO.JS - Informazioni Famiglie Olfattive
// ===================================================

import { supabase } from '../supabase.js';
import { createTitle } from '../components.js?v=3';

export async function renderInfo(container) {
    console.log('[VIEW] Rendering Info...');
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'info-wrapper';

    const title = createTitle('Informazioni', 2);
    title.classList.add('page-title');
    wrapper.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'page-subtitle';
    subtitle.textContent = 'Qui sono presenti tutte le famiglie e le relative informazioni';
    wrapper.appendChild(subtitle);

    // Fetch families
    const { data: families, error } = await supabase.from('families').select('*').order('name_it');

    if (error) {
        const errP = document.createElement('p');
        errP.textContent = 'Errore nel caricamento: ' + error.message;
        wrapper.appendChild(errP);
        container.appendChild(wrapper);
        return;
    }

    if (!families || families.length === 0) {
        const emptyP = document.createElement('p');
        emptyP.textContent = 'Nessuna famiglia olfattiva trovata.';
        wrapper.appendChild(emptyP);
        container.appendChild(wrapper);
        return;
    }

    const listContainer = document.createElement('div');
    listContainer.className = 'family-list';

    for (const f of families) {
        const card = document.createElement('div');
        card.className = 'family-card';

        const header = document.createElement('div');
        header.className = 'family-card-header';
        const hName = document.createElement('h3');
        hName.textContent = f.name_it || f.name || '—';
        const hIcon = document.createElement('span');
        hIcon.className = 'material-symbols-outlined';
        hIcon.textContent = 'expand_more';
        header.appendChild(hName);
        header.appendChild(hIcon);

        const body = document.createElement('div');
        body.className = 'family-card-body hidden';

        // Description
        if (f.description) {
            const desc = document.createElement('p');
            desc.textContent = f.description;
            body.appendChild(desc);
        }

        // Fetch essences in this family
        const { data: famEssences } = await supabase.from('inventory')
            .select('id, name')
            .eq('category', 'Essenze')
            .eq('family_id', f.id);

        if (famEssences && famEssences.length > 0) {
            const essTitle = document.createElement('p');
            essTitle.innerHTML = `<strong>Essenze:</strong> ${famEssences.map(e => e.name).join(', ')}`;
            body.appendChild(essTitle);
        }

        // Fetch pairings
        const { data: pairings } = await supabase.from('family_pairings')
            .select('target_family_id, type')
            .eq('source_family_id', f.id);

        if (pairings && pairings.length > 0) {
            const harmony = pairings.filter(p => p.type === 'armonia');
            const contrast = pairings.filter(p => p.type === 'contrasto');

            if (harmony.length > 0) {
                const hNames = harmony.map(p => families.find(fam => fam.id === p.target_family_id)?.name_it || p.target_family_id).join(', ');
                const hP = document.createElement('p');
                hP.innerHTML = `<strong>Abbinamenti per armonia:</strong> ${hNames}`;
                body.appendChild(hP);
            }
            if (contrast.length > 0) {
                const cNames = contrast.map(p => families.find(fam => fam.id === p.target_family_id)?.name_it || p.target_family_id).join(', ');
                const cP = document.createElement('p');
                cP.innerHTML = `<strong>Abbinamenti per contrasto:</strong> ${cNames}`;
                body.appendChild(cP);
            }
        }

        header.onclick = () => {
            body.classList.toggle('hidden');
            hIcon.textContent = body.classList.contains('hidden') ? 'expand_more' : 'expand_less';
        };

        card.appendChild(header);
        card.appendChild(body);
        listContainer.appendChild(card);
    }

    wrapper.appendChild(listContainer);
    container.appendChild(wrapper);
}
