// ===================================================
// DASHBOARD.JS - Home 2 (Quartier Generale)
// ===================================================
import { createButton, createCard, createTitle, createAlert } from '../components.js?v=3';
import { getImageUrlFromRecord } from '../image.js?v=5';

export async function renderDashboard(container) {
    console.log('[VIEW] Rendering Dashboard...');

    function escapeHtml(unsafe) {
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'dashboard-wrapper';

    const title = createTitle('CandleApp', 2);
    title.classList.add('dashboard-title');
    wrapper.appendChild(title);

    // PONTE 1: Alerts (Scorte basse)
    async function getAlerts() {
        try {
            const threshold = 150;
            const res = await fetch(`/api/inventory?low_stock=true&threshold=${threshold}`);
            if (!res.ok) throw new Error('Alert error');
            const lowItems = await res.json();

            if (lowItems && lowItems.length > 0) {
                const itemsText = lowItems.map(i => {
                    const qty = (i.quantity_g !== null && i.quantity_g !== undefined) ? `${i.quantity_g}g` : '—';
                    return `${i.name} (${qty})`;
                }).join(', ');
                return { text: `Attenzione: scorte basse per ${itemsText}`, variant: 'warning' };
            }
            return null;
        } catch (e) {
            console.warn('[DASHBOARD] Could not compute alerts', e);
            return null;
        }
    }

    const dbAlert = await getAlerts();
    if (dbAlert) {
        wrapper.appendChild(createAlert(dbAlert.text, dbAlert.variant));
    }

    const btnCreate = createButton('Crea una nuova candela', 'add_circle', 'btn-primary btn-compact');
    btnCreate.classList.add('dashboard-create-btn');
    btnCreate.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'lab' }));
    wrapper.appendChild(btnCreate);

    const subtitle = document.createElement('h3');
    subtitle.className = 'dashboard-subtitle';
    subtitle.textContent = 'Candele recenti';
    wrapper.appendChild(subtitle);

    // Auth su vercel
    const user = JSON.parse(localStorage.getItem('candle_user') || 'null');
    const userId = user?.id;
            
    if (!userId) {
        wrapper.appendChild(createCard('Accesso richiesto', '<p>Effettua il login per visualizzare le tue candele.</p>', [createButton('Vai al login', '', 'btn-primary btn-compact')]));
        container.appendChild(wrapper);
        return;
    }

    // PONTE 2: Fetch recent candle logs
    let logs = [];
    try {
        const res = await fetch(`/api/candles?user_id=${userId}&limit=10`);
        if (!res.ok) throw new Error('Impossibile caricare le candele');
        logs = await res.json();
    } catch (e) {
        console.error('[DASHBOARD] Error fetching candle logs', e);
        wrapper.appendChild(createCard('Errore', `<p>Impossibile caricare le ultime candele: ${e.message || e}</p>`));
        container.appendChild(wrapper);
        return;
    }
    
    if (logs.length === 0) {
        wrapper.appendChild(createCard('Nessuna candela ancora', '<p>Prova a creare la prima candela!</p>', [createButton('Crea', 'add_circle', 'btn-primary btn-compact')]));
        container.appendChild(wrapper);
        return;
    }

    // PONTE 3: Pre-fetch related entities in batch
    const blendIds = Array.from(new Set(logs.map(l => l.blend_id).filter(Boolean)));
    const moldIds = Array.from(new Set(logs.map(l => l.mold_id).filter(Boolean)));

    const fetchBatch = async (endpoint, ids) => {
        if (!ids || ids.length === 0) return [];
        try {
            const r = await fetch(`/api/${endpoint}?ids=${ids.join(',')}`);
            return r.ok ? await r.json() : [];
        } catch(e) { return []; }
    };

    const [blendData, moldData] = await Promise.all([
        fetchBatch('blends', blendIds),
        fetchBatch('inventory', moldIds)
    ]);

    const blendMap = {};
    blendData.forEach(b => { blendMap[b.id] = b; });
    const moldMap = {};
    moldData.forEach(m => { moldMap[m.id] = m; });

    // PONTE 4: Fetch families based on blends
    const familyIds = Array.from(new Set(blendData.map(b => b.resulting_family_id).filter(Boolean)));
    const familyData = await fetchBatch('families', familyIds);
    const familyMap = {};
    familyData.forEach(f => { familyMap[f.id] = f; });

    function buildCandleCard(log, mold, blend, family) {
        const candleName = blend?.name || `Candela ${log.batch_number || '—'}`;
        const moldName = mold?.name || '—';
        const moldCapacity = mold?.quantity_g ? `${mold.quantity_g} g` : '—';
        const composition = blend?.name || '—';
        const familyName = family?.name_it || '—';

        const card = document.createElement('div');
        card.className = 'essence-card fluid-essence-card dashboard-candle-card';

        const topSection = document.createElement('div');
        topSection.className = 'candle-top-section';

        const infoCol = document.createElement('div');
        infoCol.className = 'candle-info-col';

        const nameEl = document.createElement('div');
        nameEl.className = 'essence-name';
        nameEl.textContent = candleName;
        infoCol.appendChild(nameEl);

        const details = [
            { label: 'Stampo', value: moldName },
            { label: 'Capacità stampo', value: moldCapacity },
            { label: 'Composizione', value: composition },
            { label: 'Famiglia', value: familyName }
        ];

        details.forEach(d => {
            const detailEl = document.createElement('div');
            detailEl.className = 'essence-meta';
            detailEl.textContent = `${d.label}: ${d.value}`;
            infoCol.appendChild(detailEl);
        });

        topSection.appendChild(infoCol);

        const imageCol = document.createElement('div');
        imageCol.className = 'candle-image-col';

        const imageUrl = getImageUrlFromRecord(mold);
        if (imageUrl) {
            const img = document.createElement('img');
            img.className = 'card-media';
            img.src = imageUrl;
            img.alt = moldName;
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
        bottomActions.style.justifyContent = 'flex-start';

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
            
            // PONTE 5: Cancellazione
            try {
                const res = await fetch(`/api/candles?id=${log.id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Errore durante l\'eliminazione');
                window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
            } catch(err) {
                alert('Errore: ' + err.message);
            }
        };

        bottomActions.appendChild(btnInfo);
        bottomActions.appendChild(btnEdit);
        bottomActions.appendChild(btnDelete);
        card.appendChild(bottomActions);

        card.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'candle-detail:' + log.id }));

        return card;
    }

    const cardPromises = logs.map(async (log) => {
        const blend = blendMap[log.blend_id] || null;
        const mold = moldMap[log.mold_id] || null;
        const family = blend?.resulting_family_id ? familyMap[blend.resulting_family_id] : null;

        return buildCandleCard(log, mold, blend, family);
    });

    const cards = await Promise.all(cardPromises);
    cards.forEach(c => wrapper.appendChild(c));

    container.appendChild(wrapper);
}