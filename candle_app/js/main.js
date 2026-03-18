// ===================================================
// MAIN.JS - Router e Inizializzazione App
// ===================================================

import { supabase } from './supabase.js';
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
import { renderCandlesByEssence } from './views/candles_by_essence.js';

// Riferimenti UI
const container = document.getElementById('app-container');
const topBar = document.getElementById('top-bar');
const bottomNav = document.querySelector('.bottom-nav');

// Helper sicuro per mostrare messaggi di errore in pagina
function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ===== THEME MANAGEMENT =====
const THEME_STORAGE_KEY = 'candleapp_theme';

function getStoredTheme() {
    return localStorage.getItem(THEME_STORAGE_KEY);
}

function setStoredTheme(value) {
    if (value === null) {
        localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
        localStorage.setItem(THEME_STORAGE_KEY, value);
    }
}

function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getPreferredTheme() {
    const stored = getStoredTheme();
    return stored === 'light' || stored === 'dark' ? stored : null;
}

function getEffectiveTheme() {
    return getPreferredTheme() || getSystemTheme();
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);

    // Update PWA theme color
    requestAnimationFrame(() => {
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) {
            const background = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-background').trim();
            if (background) themeMeta.setAttribute('content', background);
        }
    });
}

function applySystemTheme() {
    applyTheme(getEffectiveTheme());
}

// Toast helper (global) --------------------------------------------------
function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, duration = 3200) {
    // Toast rimosso su richiesta
}

// Expose helpers so other views (e.g. profile) can let users toggle theme.
window.CandleApp = {
    getStoredTheme,
    getEffectiveTheme,
    setTheme: (theme) => {
        if (theme === 'light' || theme === 'dark') {
            setStoredTheme(theme);
        } else {
            setStoredTheme(null);
        }
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
        // Only update if the user is not overriding theme.
        if (!getPreferredTheme()) applySystemTheme();
    });
}

// ===== ROUTER =====
async function navigateTo(rawInput) {
    window.onTopBackClicked = null;
    const _parts = String(rawInput).split(':');
    const pageId = _parts[0];
    const param = _parts.slice(1).join(':') || null;
    console.log(`[ROUTER] Navigating to: ${pageId}, param: ${param}`);
    /* window.scrollTo(0,0) deferred */

    // Controlla sessione per decidere visibilità barre
    const { data: { session } } = await supabase.auth.getSession();
    const publicPages = ['landing', 'login', 'register'];
    if (!session && publicPages.includes(pageId)) {
        // Public pages when logged out: hide bars
        topBar.classList.add('hidden');
        bottomNav.classList.add('hidden');
        document.body.classList.remove('with-bars');
    } else {
        // Logged in or non-public page: show bars
        topBar.classList.remove('hidden');
        bottomNav.classList.remove('hidden');
        document.body.classList.add('with-bars');
    }

    // Update top bar content dynamically based on session & page
    async function updateTopBarFor(pageId, session) {
        try {
            const topBarEl = document.getElementById('top-bar');
            // No session and public landing -> clear header
            if (!session && pageId === 'landing') { topBarEl.innerHTML = ''; return; }

            // Get user display name when logged in
            const user = session?.user;
            const rawName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'CandleApp';
            const userName = String(rawName).split(' ').map(p => p ? (p[0].toUpperCase() + p.slice(1)) : '').join(' ');

            if (pageId === 'dashboard') {
                topBarEl.innerHTML = `
                    <div class="left-slot"><button id="top-back" class="icon-btn square"><span class="material-symbols-outlined">reply</span></button></div>
                    <div class="top-title">${userName}</div>
                    <div class="right-slot"><button id="top-logout" class="btn-link">LogOut</button></div>
                `;
                const backBtn = document.getElementById('top-back'); if (backBtn) backBtn.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'landing' }));
                const logoutBtn = document.getElementById('top-logout'); if (logoutBtn) logoutBtn.onclick = async () => { await supabase.auth.signOut(); window.dispatchEvent(new CustomEvent('navigate', { detail: 'landing' })); };
                return;
            }

            if (['inventory','lab','info','profile'].includes(pageId)) {
                // On these pages show a reply icon that behaves contextually
                topBarEl.innerHTML = `
                    <div class="left-slot"><button id="top-home" class="icon-btn square"><span class="material-symbols-outlined">reply</span></button></div>
                    <div class="top-title">${userName}</div>
                    <div class="right-slot"><button id="top-logout" class="btn-link">LogOut</button></div>
                `;
                const homeBtn = document.getElementById('top-home'); 
                if (homeBtn) {
                    homeBtn.onclick = () => {
                        if (typeof window.onTopBackClicked === 'function') {
                            window.onTopBackClicked();
                        } else {
                            window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
                        }
                    };
                }
                const logoutBtn = document.getElementById('top-logout'); if (logoutBtn) logoutBtn.onclick = async () => { await supabase.auth.signOut(); window.dispatchEvent(new CustomEvent('navigate', { detail: 'landing' })); };
                return;
            }

            if (['inventory-detail','pairings','stock','add-essence'].includes(pageId)) {
                // Sub-pages: back button goes to inventory
                topBarEl.innerHTML = `
                    <div class="left-slot"><button id="top-back" class="icon-btn square"><span class="material-symbols-outlined">reply</span></button></div>
                    <div class="top-title">${userName}</div>
                    <div class="right-slot"><button id="top-logout" class="btn-link">LogOut</button></div>
                `;
                const backBtn = document.getElementById('top-back'); if (backBtn) backBtn.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
                const logoutBtn = document.getElementById('top-logout'); if (logoutBtn) logoutBtn.onclick = async () => { await supabase.auth.signOut(); window.dispatchEvent(new CustomEvent('navigate', { detail: 'landing' })); };
                return;
            }

            if (pageId === 'landing') {
                // Landing while logged-in: show name + logout, no left home icon
                topBarEl.innerHTML = `
                    <div class="left-slot"></div>
                    <div class="top-title">${userName}</div>
                    <div class="right-slot"><button id="top-logout" class="btn-link">LogOut</button></div>
                `;
                const logoutBtn = document.getElementById('top-logout'); if (logoutBtn) logoutBtn.onclick = async () => { await supabase.auth.signOut(); window.dispatchEvent(new CustomEvent('navigate', { detail: 'landing' })); };
                return;
            }

            // Default: show back + user + logout
            topBarEl.innerHTML = `
                <div class="left-slot"><button id="top-back" class="icon-btn square"><span class="material-symbols-outlined">reply</span></button></div>
                <div class="top-title">${userName}</div>
                <div class="right-slot"><button id="top-logout" class="btn-link">LogOut</button></div>
            `;
            const backBtn2 = document.getElementById('top-back'); if (backBtn2) backBtn2.onclick = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'landing' }));
            const logoutBtn2 = document.getElementById('top-logout'); if (logoutBtn2) logoutBtn2.onclick = async () => { await supabase.auth.signOut(); window.dispatchEvent(new CustomEvent('navigate', { detail: 'landing' })); };        } catch (e) {
            console.warn('[ROUTER] updateTopBarFor failed', e);
        }
    }

    await updateTopBarFor(pageId, session);

    // Routing delle viste
    try {
        // Mostra loading nella UI (ad es. sulla top bar)
        topBar.classList.add('loading');

        // Crea un contenitore temporaneo per non svuotare subito la pagina attuale
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
            case 'candles-by-essence': await renderCandlesByEssence(frame, param); break;
            case 'profile': await renderProfile(frame); break;
            default:
                frame.innerHTML = '<h1>Pagina non trovata</h1>';
        }
        
        // Sostituisce il contenuto solo quando il rendering (e le chiamate di rete) è finito
        // Smooth cross-fade transition (fade out old frame, then show new frame)
        const oldFrames = Array.from(container.children);

        if (oldFrames.length > 0) {
            // Fade out the old frames first so they don't overlap the new frame.
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

// ===== AGGIORNAMENTO ICONE NAVBAR =====
function updateActiveIcon(pageIdRaw) {
    const pageId = String(pageIdRaw || '').split(':')[0];
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    // map fragment pages to top-level nav targets
    const mapping = {
        'inventory-detail': 'inventory',
        'add-essence': 'inventory',
        'pairings': 'inventory',
        'stock': 'inventory',
        'lab': 'lab',
        'info': 'info',
        'profile': 'profile',
        'dashboard': null
    };
    const target = mapping[pageId] || pageId;
    const activeBtn = target ? document.querySelector(`[data-target="${target}"]`) : null;
    if (activeBtn) activeBtn.classList.add('active');
}

// ===== INIZIALIZZAZIONE NAVBAR =====
function initNavbar() {
    if (!bottomNav) return;
    bottomNav.innerHTML = '';
    
    const navItems = [
        // Dashboard moved to top-left / header - not included in bottom nav
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

// ===== EVENTI GLOBALI =====
window.addEventListener('navigate', (e) => { navigateTo(e.detail).catch(err => console.error('[ROUTER] navigate failed', err)); });

// ===== INIZIALIZZAZIONE APP =====
async function init() {
    console.log('[APP] Initializing...');

    // Global error captures
    window.addEventListener('error', (e) => {
        console.error('[GLOBAL ERROR]', e.error || e.message || e);
        const overlay = document.getElementById('error-overlay') || document.createElement('div');
        overlay.id = 'error-overlay';
        overlay.style = 'position:fixed;right:10px;bottom:10px;padding:8px;background:rgba(255,0,0,0.9);color:#fff;font-size:12px;border-radius:6px;z-index:9999;max-width:320px;';
        overlay.textContent = 'Errore: ' + (e.error?.message || e.message || 'Sconosciuto');
        document.body.appendChild(overlay);
    });
    window.addEventListener('unhandledrejection', (e) => {
        console.error('[UNHANDLED REJECTION]', e.reason || e);
    });

    initNavbar();
    
    // Listen to auth changes to update header/nav dynamically
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('[AUTH] state changed', event, session);
        if (event === 'SIGNED_OUT') { navigateTo('landing').catch(err => console.error(err)); }
    });

    // Controlla autenticazione alla partenza
    const { data: { session } } = await supabase.auth.getSession();
    // Vai sempre alla home all'apertura della PWA
    await navigateTo('landing');
}

init();
