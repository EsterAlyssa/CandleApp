// ===================================================
// PROFILE.JS - Profilo Utente
// ===================================================

import { supabase } from '../supabase.js';
import { createTitle } from '../components.js?v=3';

export async function renderProfile(container) {
    console.log('[VIEW] Rendering Profile...');
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'profile-wrapper';

    const title = createTitle('Profilo', 2);
    title.classList.add('page-title');
    wrapper.appendChild(title);

    // Get user info
    const { data: { user } } = await supabase.auth.getUser();
    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utente';
    const userId = user?.id;

    // Greeting
    const greeting = document.createElement('h2');
    greeting.className = 'profile-greeting';
    greeting.textContent = `Ciao ${name}!`;
    wrapper.appendChild(greeting);

    // Stats from DB
    let candleCount = 0;
    let lowEssences = 0;
    let emptyEssences = 0;

    if (userId) {
        const [candleRes, lowRes, emptyRes] = await Promise.all([
            supabase.from('candle_log').select('id', { count: 'exact', head: true }).eq('user_id', userId),
            supabase.from('inventory').select('id').eq('category', 'Essenze').lt('quantity_g', 100).gt('quantity_g', 0),
            supabase.from('inventory').select('id').eq('category', 'Essenze').lte('quantity_g', 0)
        ]);
        candleCount = candleRes.count || 0;
        lowEssences = lowRes.data?.length || 0;
        emptyEssences = emptyRes.data?.length || 0;
    }

    const statsDiv = document.createElement('div');
    statsDiv.className = 'profile-stats';

    const statItems = [
        { icon: 'local_fire_department', text: `Hai creato ${candleCount} candel${candleCount === 1 ? 'a' : 'e'}!` },
        { icon: 'warning', text: `Ci sono ${lowEssences} essenz${lowEssences === 1 ? 'a' : 'e'} quasi finit${lowEssences === 1 ? 'a' : 'e'}!` },
        { icon: 'error', text: `C'${emptyEssences === 1 ? 'è' : 'sono'} ${emptyEssences} essenz${emptyEssences === 1 ? 'a' : 'e'} finit${emptyEssences === 1 ? 'a' : 'e'}!` }
    ];

    statItems.forEach(s => {
        const item = document.createElement('div');
        item.className = 'profile-stat-item';
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.textContent = s.icon;
        const text = document.createElement('span');
        text.textContent = s.text;
        item.appendChild(icon);
        item.appendChild(text);
        statsDiv.appendChild(item);
    });

    wrapper.appendChild(statsDiv);
    container.appendChild(wrapper);
}
