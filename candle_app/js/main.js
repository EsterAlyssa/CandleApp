// ===================================================
// MAIN.JS - Router e Inizializzazione App (Custom Vercel Auth)
// ===================================================

import { loadEnv } from './env.js';
import { renderLanding } from './views/landing.js';
import { renderLogin } from './views/login.js';
import { renderRegister } from './views/register.js';
import { renderDashboard } from './views/dashboard.js';
import { renderInventory } from './views/inventory.js';
import { renderInventoryDetail } from './views/inventory_detail.js';
import { renderAddEssence } from './views/add_essence.js';
import { renderPairings } from './views/pairings.js';
import { renderLab } from './views/lab.js';
import { renderInfo } from './views/info.js';
import { renderProfile } from './views/profile.js';
import { renderStock } from './views/stock.js';
import { renderCandleDetail } from './views/candle_detail.js';
import { renderGuide } from './views/guide.js';
import { renderCandlesByEssence } from './views/candles_by_essence.js';
import { renderEditBlend } from './views/edit_blend.js?v=4';
import * as Store from './store.js';

await loadEnv();

const container = document.getElementById('app-container');
const topBar = document.getElementById('top-bar');
const bottomNav = document.querySelector('.bottom-nav');

function escapeHtml(unsafe) {
    return String(unsafe).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ===== THEME MANAGEMENT =====
const THEME_STORAGE_KEY = 'candleapp_theme';

function getStoredTheme() { return localStorage.getItem(THEME_STORAGE_KEY); }
function setStoredTheme(value) {
    if (value === null) localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, value);
}
function getSystemTheme() { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
function getPreferredTheme() {
    const stored = getStoredTheme();
    return stored === 'light' || stored === 'dark' ? stored : null;
}
function getEffectiveTheme() { return getPreferredTheme() || getSystemTheme(); }
function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);

    requestAnimationFrame(() => {
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) {
            const background = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-background').trim();
            if (background) themeMeta.setAttribute('content', background);
        }
    });
}
function applySystemTheme() { applyTheme(getEffectiveTheme()); }

function showToast(message, duration = 3200) {}

window.CandleApp = {
    getStoredTheme, getEffectiveTheme,
    setTheme: (theme) => {
        if (theme === 'light' || theme === 'dark') setStoredTheme(theme);
        else setStoredTheme(null);
        applySystemTheme();
    },
    resetToSystem: () => {
        setStoredTheme(null);
        applySystemTheme();
    },
    showToast
};

if (window.matchMedia) {
    applySystemTheme();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (!getPreferredTheme()) applySystemTheme();
    });
}

// ===== ROUTER =====
function navigateBack() {
    const prev = Store.popNavigation();
    if (prev) navigateTo(prev, { skipHistoryPush: true });
    else navigateTo('dashboard', { skipHistoryPush: true });
}

async function navigateTo(rawInput, options = {}) {
    window.onTopBackClicked = null;
    const _parts = String(rawInput).split(':');
    const pageId = _parts[0];
    const param = _parts.slice(1).join(':') || null;
    console.log(`[ROUTER] Navigating to: ${pageId}`);
    
    if (!options.skipHistoryPush) Store.pushNavigation(rawInput);
    Store.setCurrentPage(rawInput);

    // CUSTOM AUTH: Controllo sessione sincrono
    const user = JSON.parse(localStorage.getItem('candle_user') || 'null');
    
    const publicPages = ['landing', 'login', 'register'];
    if (!user && publicPages.includes(pageId)) {
        topBar.classList.add('hidden');
        bottomNav.classList.add('hidden');
        document.body.classList.remove('with-bars');
    } else {
        topBar.classList.remove('hidden');
        bottomNav.classList.remove('hidden');
        document.body.classList.add('with-bars');
    }

    async function updateTopBarFor(pageId, currentUser) {
        try {
            const topBarEl = document.getElementById('top-bar');
            if (!currentUser && pageId === 'landing') { topBarEl.innerHTML = ''; return; }

            const rawName = currentUser?.name || currentUser?.email?.split('@')[0] || 'CandleApp';
            const userName = String(rawName).split(' ').map(p => p ? (p[0].toUpperCase() + p.slice(1)) : '').join(' ');

            const createBackButton = (targetPage) => {
                return () => {
                    if (typeof window.onTopBackClicked === 'function') window.onTopBackClicked();
                    else if (targetPage) window.dispatchEvent(new CustomEvent('navigate', { detail: targetPage }));
                    else navigateBack();
                };
            };

            const handleLogout = () => {
                Store.resetAllState();
                localStorage.removeItem('candle_token');
                localStorage.removeItem('candle_user');
                window.dispatchEvent(new CustomEvent('navigate', { detail: 'landing' }));
            };

            const buildTopBar = (leftIcon, showLeft = true) => {
                return `
                    <div class="left-slot">${showLeft ? `<button id="top-back" class="icon-btn square"><span class="material-symbols-outlined">${leftIcon}</span></button>` : ''}</div>
                    <div class="top-title">${userName}</div>
                    <div class="right-slot"><button id="top-logout" class="btn-link">LogOut</button></div>
                `;
            };

            if (pageId === 'dashboard') {
                topBarEl.innerHTML = buildTopBar('reply');
                document.getElementById('top-back').onclick = createBackButton('landing');
            } else if (['inventory','lab','info','profile'].includes(pageId)) {
                topBarEl.innerHTML = buildTopBar('reply');
                document.getElementById('top-back').onclick = createBackButton('dashboard');
            } else if (['inventory-detail','pairings','stock','add-essence','candles-by-essence', 'edit-blend'].includes(pageId)) {
                topBarEl.innerHTML = buildTopBar('reply');
                document.getElementById('top-back').onclick = createBackButton('inventory');
            } else if (pageId === 'candle-detail' || pageId === 'guide') {
                topBarEl.innerHTML = buildTopBar('reply');
                document.getElementById('top-back').onclick = createBackButton('dashboard');
            } else if (pageId === 'landing') {
                topBarEl.innerHTML = buildTopBar('', false);
            } else {
                topBarEl.innerHTML = buildTopBar('reply');
                document.getElementById('top-back').onclick = createBackButton(null);
            }

            const logoutBtn = document.getElementById('top-logout');
            if (logoutBtn) logoutBtn.onclick = handleLogout;
        } catch (e) { console.warn('[ROUTER] updateTopBarFor failed', e); }
    }

    await updateTopBarFor(pageId, user);

    if (bottomNav) {
        if (pageId === 'landing' || pageId === 'login' || pageId === 'register') bottomNav.style.display = 'none';
        else bottomNav.style.display = '';
    }

    try {
        topBar.classList.add('loading');
        const frame = document.createElement('div');
        frame.className = 'view-frame fade-in';
        
        switch (pageId) {
            case 'landing': await renderLanding(frame); break;
            case 'login': await renderLogin(frame); break;
            case 'register': await renderRegister(frame); break;
            case 'dashboard': await renderDashboard(frame); break;
            case 'inventory': await renderInventory(frame); break;
            case 'inventory-detail': await renderInventoryDetail(frame, param); break;
            case 'add-essence': await renderAddEssence(frame, param); break;
            case 'pairings': await renderPairings(frame, param); break;
            case 'stock': await renderStock(frame, param); break;
            case 'lab': await renderLab(frame, param); break;
            case 'info': await renderInfo(frame); break;
            case 'candle-detail': await renderCandleDetail(frame, param); break;
            case 'guide': await renderGuide(frame, param); break;
            case 'candles-by-essence': await renderCandlesByEssence(frame, param); break;
            case 'edit-blend': await renderEditBlend(frame, param); break;
            case 'profile': await renderProfile(frame); break;
            default: frame.innerHTML = '<h1>Pagina non trovata</h1>';
        }
        
        const oldFrames = Array.from(container.children);
        if (oldFrames.length > 0) {
            oldFrames.forEach(f => f.classList.add('fade-out'));
            container.style.position = 'relative';
            await new Promise(resolve => setTimeout(resolve, 180));
            oldFrames.forEach(f => f.remove());
            container.style.position = '';
        }

        container.appendChild(frame);
        updateActiveIcon(pageId);
    } catch (error) {
        console.error(`[ROUTER] Error rendering ${pageId}:`, error);
        container.innerHTML = `<h1>Errore nel caricamento</h1>
            <div class="error-details">${escapeHtml(error.message || String(error))}</div>
            <pre class="error-stack">${escapeHtml(error.stack || '')}</pre>`;
    } finally {
        topBar.classList.remove('loading');
    }
}

function updateActiveIcon(pageIdRaw) {
    const pageId = String(pageIdRaw || '').split(':')[0];
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const mapping = {
        'inventory-detail': 'inventory', 'add-essence': 'inventory', 'pairings': 'inventory',
        'stock': 'inventory', 'edit-blend': 'inventory', 'lab': 'lab', 'info': 'info',
        'profile': 'profile', 'dashboard': null
    };
    const target = mapping[pageId] || pageId;
    const activeBtn = target ? document.querySelector(`[data-target="${target}"]`) : null;
    if (activeBtn) activeBtn.classList.add('active');
}

function initNavbar() {
    if (!bottomNav) return;
    bottomNav.innerHTML = '';
    const navItems = [
        { id: 'inventory', icon: 'stock.png', label: 'Magazzino' },
        { id: 'lab', icon: 'lab.png', label: 'Laboratorio' },
        { id: 'info', icon: 'fiore.png', label: 'Info' },
        { id: 'profile', icon: 'user.png', label: 'Profilo' }
    ];
    navItems.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'nav-item';
        btn.setAttribute('data-target', item.id);
        btn.onclick = () => navigateTo(item.id);
        const img = document.createElement('img');
        img.src = `/assets/${item.icon}`;
        img.alt = item.label;
        img.className = 'navbar-icon';
        btn.appendChild(img);
        bottomNav.appendChild(btn);
    });
}

window.addEventListener('navigate', (e) => { navigateTo(e.detail).catch(err => console.error('[ROUTER] navigate failed', err)); });
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) navigateTo(e.state.page, { skipHistoryPush: true }).catch(err => console.error('[ROUTER] popstate navigate failed', err));
});

// ===== INIZIALIZZAZIONE APP =====
async function init() {
    console.log('[APP] Initializing...');
    window.addEventListener('error', (e) => {
        console.error('[GLOBAL ERROR]', e.error || e.message || e);
        const overlay = document.getElementById('error-overlay') || document.createElement('div');
        overlay.id = 'error-overlay';
        overlay.style = 'position:fixed;right:10px;bottom:10px;padding:8px;background:rgba(255,0,0,0.9);color:#fff;font-size:12px;border-radius:6px;z-index:9999;max-width:320px;';
        overlay.textContent = 'Errore: ' + (e.error?.message || e.message || 'Sconosciuto');
        document.body.appendChild(overlay);
    });
    window.addEventListener('unhandledrejection', (e) => { console.error('[UNHANDLED REJECTION]', e.reason || e); });

    initNavbar();
    
    // Custom Auth Init
    const user = JSON.parse(localStorage.getItem('candle_user') || 'null');
    
    if (user?.id) {
        Store.setAuthUserId(user.id);
    } else {
        Store.setAuthUserId(null);
    }
    
    const savedPage = Store.getCurrentPage();
    if (savedPage && savedPage !== 'landing' && user) {
        console.log('[APP] Resuming to saved page:', savedPage);
        await navigateTo(savedPage, { skipHistoryPush: true });
    } else {
        await navigateTo('landing');
    }
}

init();