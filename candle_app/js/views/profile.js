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
            supabase.from('inventory').select('id').eq('category', 'scent').lt('quantity_g', 100).gt('quantity_g', 0),
            supabase.from('inventory').select('id').eq('category', 'scent').lte('quantity_g', 0)
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
        { icon: 'error', text: `${emptyEssences === 1 ? 'C\'è' : 'Ci sono'} ${emptyEssences} essenz${emptyEssences === 1 ? 'a' : 'e'} finit${emptyEssences === 1 ? 'a' : 'e'}!` }
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

    // Theme selector (system / light / dark)
    const settingsCard = document.createElement('div');
    settingsCard.className = 'settings-card';

    const settingsTitle = document.createElement('h3');
    settingsTitle.textContent = 'Impostazioni';
    settingsCard.appendChild(settingsTitle);

    const themeItem = document.createElement('div');
    themeItem.className = 'setting-item';

    const themeLabel = document.createElement('span');
    themeLabel.textContent = 'Tema';

    const themeSelector = document.createElement('div');
    themeSelector.className = 'theme-selector';

    const options = [
        { value: null, label: 'Sistema' },
        { value: 'light', label: 'Chiaro' },
        { value: 'dark', label: 'Scuro' }
    ];

    const optionEls = options.map(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-option';
        btn.dataset.value = opt.value === null ? 'system' : opt.value;
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
            setTheme(opt.value);
        });
        themeSelector.appendChild(btn);
        return btn;
    });

    themeItem.appendChild(themeLabel);
    themeItem.appendChild(themeSelector);
    settingsCard.appendChild(themeItem);

    const themeHint = document.createElement('div');
    themeHint.className = 'setting-hint';
    settingsCard.appendChild(themeHint);

    const updateThemeUI = () => {
        const stored = window.CandleApp?.getStoredTheme?.();
        const effective = window.CandleApp?.getEffectiveTheme?.() || 'light';
        const activeValue = stored === null ? 'system' : stored;

        optionEls.forEach(el => {
            const isActive = el.dataset.value === activeValue;
            el.classList.toggle('active', isActive);
        });

        const activeBtn = optionEls.find(el => el.classList.contains('active'));
        if (activeBtn) {
            const rect = activeBtn.getBoundingClientRect();
            const parentRect = themeSelector.getBoundingClientRect();
            const left = rect.left - parentRect.left;
            themeSelector.style.setProperty('--highlight-left', `${left}px`);
            themeSelector.style.setProperty('--highlight-width', `${rect.width}px`);
        }

        themeHint.textContent = stored === null
            ? 'Il tema segue le impostazioni del sistema.'
            : `Tema impostato manualmente: ${stored}.`; 
    };

    const setTheme = (value) => {
        if (!window.CandleApp) return;
        if (value === null) {
            window.CandleApp.resetToSystem();
            window.CandleApp.showToast('Tema impostato sul tema di sistema');
        } else {
            window.CandleApp.setTheme(value);
            window.CandleApp.showToast(`Tema impostato su ${value === 'dark' ? 'Scuro' : 'Chiaro'}`);
        }
        updateThemeUI();
    };

    // Sync when the system theme changes (only if no manual override)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
        if (!window.CandleApp?.getStoredTheme?.()) {
            updateThemeUI();
        }
    };
    mediaQuery.addEventListener?.('change', onSystemChange);

    updateThemeUI();

    wrapper.appendChild(settingsCard);
    container.appendChild(wrapper);
}
