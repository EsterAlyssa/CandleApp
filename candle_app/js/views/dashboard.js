// ===================================================
// DASHBOARD.JS - Home 2 (Quartier Generale)
// ===================================================

import { supabase } from '../supabase.js';
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

    // Titolo
    const title = createTitle('CandleApp', 2);
    title.classList.add('dashboard-title');
    wrapper.appendChild(title);

    // Determine alerts based on DB (e.g., low inventory)
    async function getAlerts() {
        try {
            // Low-stock items (threshold can be tuned)
            const threshold = 150;
            const { data: lowItems, error } = await supabase
                .from('inventory')
                .select('id, name, quantity_g')
                .filter('quantity_g', 'lt', threshold)
                .order('quantity_g', { ascending: true })
                .limit(5);
            if (error) throw error;
            if (lowItems && lowItems.length > 0) {
                const itemsText = lowItems.map(i => {
                const qty = (i.quantity_g !== null && i.quantity_g !== undefined) ? `${i.quantity_g}g` : '—';
                return `${i.name} (${qty})`;
            }).join(', ');
            return { text: `Attenzione: scorte basse per ${itemsText}`, variant: 'warning' };
            }

            // Generic info - no alerts
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

    // Bottone Crea
    const btnCreate = createButton('Crea una nuova candela', 'add_circle', 'btn-primary btn-compact');
    btnCreate.classList.add('dashboard-create-btn');
    btnCreate.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'lab' }));
    wrapper.appendChild(btnCreate);

    // Sottotitolo
    const subtitle = document.createElement('h3');
    subtitle.className = 'dashboard-subtitle';
    subtitle.textContent = 'Candele recenti';
    wrapper.appendChild(subtitle);

    // Fetch recent candle logs for current user
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
        wrapper.appendChild(createCard('Accesso richiesto', '<p>Effettua il login per visualizzare le tue candele.</p>', [createButton('Vai al login', '', 'btn-primary btn-compact')]));
        container.appendChild(wrapper);
        return;
    }

    let logs = [];
    try {
        const { data, error } = await supabase
            .from('candle_log')
            .select('id, created_at, mold_id, wax_id, blend_id, total_wax_used, rating, notes, batch_number, is_favorite')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);
        if (error) throw error;
        logs = data || [];
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

    // Pre-fetch related entities to avoid N+1 query problem
    const blendIds = Array.from(new Set(logs.map(l => l.blend_id).filter(Boolean)));
    const moldIds = Array.from(new Set(logs.map(l => l.mold_id).filter(Boolean)));

    const [blendResp, moldResp] = await Promise.all([
        blendIds.length > 0 ? supabase.from('blends').select('id, name, resulting_family_id').in('id', blendIds) : { data: [], error: null },
        moldIds.length > 0 ? supabase.from('inventory').select('id, name, category, image_ref').in('id', moldIds) : { data: [], error: null }
    ]);

    const blendMap = {};
    (blendResp.data || []).forEach(b => { blendMap[b.id] = b; });

    const moldMap = {};
    (moldResp.data || []).forEach(m => { moldMap[m.id] = m; });

    const familyIds = Array.from(new Set((blendResp.data || []).map(b => b.resulting_family_id).filter(Boolean)));
    const familyResp = familyIds.length > 0 ? await supabase.from('families').select('id, name_it').in('id', familyIds) : { data: [], error: null };
    const familyMap = {};
    (familyResp.data || []).forEach(f => { familyMap[f.id] = f; });

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
            const { error } = await supabase.from('candle_log').delete().eq('id', log.id);
            if (error) alert('Errore: ' + error.message);
            else window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
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
