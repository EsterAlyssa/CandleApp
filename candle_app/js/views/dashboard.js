// ===================================================
// DASHBOARD.JS - Home 2 (Quartier Generale)
// ===================================================

import { supabase } from '../supabase.js';
import { createButton, createCard, createTitle, createAlert } from '../components.js?v=3';

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

    // Helper fetchers
    async function fetchBlend(id) {
        if (!id) return null;
        const { data } = await supabase.from('blends').select('id, name, resulting_family_id').eq('id', id).maybeSingle();
        return data || null;
    }
    async function fetchInventoryItem(id) {
        if (!id) return null;
        const { data } = await supabase.from('inventory').select('id, name, category, image_url').eq('id', id).maybeSingle();
        return data || null;
    }
    async function fetchFamily(id) {
        if (!id) return null;
        const { data } = await supabase.from('families').select('id, name_it').eq('id', id).maybeSingle();
        return data || null;
    }

    // Render each log as card (parallel fetches)
    const cardPromises = logs.map(async (log) => {
        const [blend, mold] = await Promise.all([fetchBlend(log.blend_id), fetchInventoryItem(log.mold_id)]);
        const family = blend?.resulting_family_id ? await fetchFamily(blend.resulting_family_id) : null;

        const titleText = blend?.name || `Candela ${log.batch_number || ''}`;

        function timeAgoOrDate(iso) {
            if (!iso) return '—';
            const d = new Date(iso);
            const diff = Date.now() - d.getTime();
            const sec = Math.floor(diff/1000);
            const min = Math.floor(sec/60);
            const hrs = Math.floor(min/60);
            const days = Math.floor(hrs/24);
            if (sec < 60) return `${sec}s fa`;
            if (min < 60) return `${min}m fa`;
            if (hrs < 24) return `${hrs}h fa`;
            if (days < 7) return `${days}gg fa`;
            return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
        }

        const created = timeAgoOrDate(log.created_at);
        const imageHtml = mold?.image_url ? `<img class="card-media" src="${mold.image_url}" alt="${mold.name}" />` : `<div class="card-media placeholder"></div>`;

        const content = `
            <div class="card-row">
                ${imageHtml}
                <div class="card-body">
                    <div class="card-meta">${created} • Batch ${log.batch_number || '—'}</div>
                    <p class="card-desc"><strong>Famiglia:</strong> ${family?.name_it || (blend?.resulting_family_id || '—')}</p>
                    <p class="card-desc"><strong>Stampo:</strong> ${mold?.name || '—'}</p>
                    <p class="card-drops"><strong>Gocce totali:</strong> ${log.total_wax_used != null ? log.total_wax_used : '—'} g</p>
                    <p class="dashboard-notes">${log.notes ? escapeHtml(log.notes) : ''}</p>
                </div>
            </div>
            <div class="dashboard-rating">${'★'.repeat(log.rating || 0)}${'☆'.repeat(5 - (log.rating || 0))}</div>
        `;
        const btnInfo = createButton('Info', 'info', 'btn-card-edit');
        btnInfo.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'info' }));
        const btnEdit = createButton('Modifica', 'edit', 'btn-card-edit');
        btnEdit.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'lab' }));
        const btnDelete = createButton('Elimina', 'delete', 'btn-card-delete');
        btnDelete.onclick = async () => {
            if (!confirm('Eliminare questa registrazione?')) return;
            const { error } = await supabase.from('candle_log').delete().eq('id', log.id);
            if (error) alert('Errore eliminazione: ' + error.message);
            else window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
        };
        const cardEl = createCard(titleText, content, [btnInfo, btnEdit, btnDelete]);
        cardEl.classList.add('dashboard-candle-card');
        return cardEl;
    });

    const cards = await Promise.all(cardPromises);
    cards.forEach(c => wrapper.appendChild(c));

    container.appendChild(wrapper);
}