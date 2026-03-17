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

    // Fetch all essences once (avoid per-family query)
    const { data: allEssences } = await supabase.from('inventory')
        .select('id, name, family_id')
        .eq('category', 'scent');
    const essencesByFamily = {};
    (allEssences || []).forEach(e => {
        if (!e.family_id) return;
        if (!essencesByFamily[e.family_id]) essencesByFamily[e.family_id] = [];
        essencesByFamily[e.family_id].push(e.name);
    });

    // Fetch all pairings once
    const { data: allPairings } = await supabase.from('family_pairings')
        .select('source_family_id, target_family_id, type');
    const pairingsByFamily = {};
    (allPairings || []).forEach(p => {
        const src = p.source_family_id ? String(p.source_family_id) : null;
        const tgt = p.target_family_id ? String(p.target_family_id) : null;
        if (src) {
            if (!pairingsByFamily[src]) pairingsByFamily[src] = [];
            pairingsByFamily[src].push({ type: p.type, other_family_id: tgt });
        }
        if (tgt) {
            if (!pairingsByFamily[tgt]) pairingsByFamily[tgt] = [];
            pairingsByFamily[tgt].push({ type: p.type, other_family_id: src });
        }
    });

    for (const f of families) {
        const card = document.createElement('div');
        card.className = 'family-card';

        const header = document.createElement('div');
        header.className = 'family-card-header';
        const hName = document.createElement('h3');
        hName.textContent = f.name_it || f.name || '—';
        const hIcon = document.createElement('span');
        hIcon.className = 'material-symbols-outlined';
        hIcon.textContent = 'expand_less';
        header.appendChild(hName);
        header.appendChild(hIcon);

        const body = document.createElement('div');
        body.className = 'family-card-body';

        // Description
        if (f.description) {
            const desc = document.createElement('p');
            desc.textContent = f.description;
            body.appendChild(desc);
        }

        // Essences
        const essences = essencesByFamily[f.id] || [];
        if (essences.length > 0) {
            const essTitle = document.createElement('p');
            essTitle.innerHTML = `<strong>Essenze:</strong> ${essences.join(', ')}`;
            body.appendChild(essTitle);
        } else {
            const essEmpty = document.createElement('p');
            essEmpty.textContent = 'Non ci sono essenze presenti in magazzino per questa famiglia.';
            body.appendChild(essEmpty);
        }

        // Pairings (always visible, even if there are no essences in stock)
        const pairings = pairingsByFamily[String(f.id)] || [];
        const findName = (id) => (families.find(fam => String(fam.id) === String(id))?.name_it || id);

        const harmony = pairings.filter(p => p.type === 'armonia');
        const contrast = pairings.filter(p => p.type === 'contrasto');

        const pairingTitle = document.createElement('p');
        pairingTitle.innerHTML = `<strong>Abbinamenti:</strong>`;
        body.appendChild(pairingTitle);

        if (harmony.length > 0) {
            const hDiv = document.createElement('div');
            hDiv.className = 'badges-container';
            hDiv.style.display = 'flex';
            hDiv.style.flexWrap = 'wrap';
            hDiv.style.gap = '8px';
            hDiv.style.marginBottom = '12px';
            hDiv.innerHTML = `<p style="width: 100%; margin-bottom: 4px;"><strong>Per armonia:</strong></p>`;
            harmony.map(p => findName(p.other_family_id)).filter((v, i, a) => a.indexOf(v) === i).forEach(name => {
                const badge = document.createElement('span');
                badge.className = 'status-badge badge-opened'; // For green styling
                badge.style.border = '1px solid currentColor';
                badge.style.background = 'transparent';
                badge.textContent = name;
                hDiv.appendChild(badge);
            });
            body.appendChild(hDiv);
        }
        if (contrast.length > 0) {
            const cDiv = document.createElement('div');
            cDiv.className = 'badges-container';
            cDiv.style.display = 'flex';
            cDiv.style.flexWrap = 'wrap';
            cDiv.style.gap = '8px';
            cDiv.style.marginBottom = '12px';
            cDiv.innerHTML = `<p style="width: 100%; margin-bottom: 4px;"><strong>Per contrasto:</strong></p>`;
            contrast.map(p => findName(p.other_family_id)).filter((v, i, a) => a.indexOf(v) === i).forEach(name => {
                const badge = document.createElement('span');
                badge.className = 'status-badge badge-opened'; // For green styling
                badge.style.border = '1px solid currentColor';
                badge.style.background = 'transparent';
                badge.textContent = name;
                cDiv.appendChild(badge);
            });
            body.appendChild(cDiv);
        }

        if (harmony.length === 0 && contrast.length === 0) {
            const noP = document.createElement('p');
            noP.textContent = 'Nessun abbinamento definito per questa famiglia.';
            body.appendChild(noP);
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
