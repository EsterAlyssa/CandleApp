// ===================================================
// STORE.JS - State Management per CandleApp PWA
// ===================================================

const STORAGE_KEY = 'candleapp_state';
const NAV_HISTORY_KEY = 'candleapp_nav_history';

// Stato iniziale
const initialState = {
    // Wizard "Crea Candela"
    wizard: {
        currentStep: 0,
        selectedMold: null,
        selectedWax: null,
        selectedEssences: [],  // Array di { id, name, family_id, family_name, note_type }
        fragrancePct: 8,
        candleName: '',
        fragranceName: '',
        editingLogId: null
    },
    // Inventory
    inventory: {
        activeTab: 'Cere'
    },
    // Navigazione
    navigation: {
        history: [],
        currentPage: 'landing'
    },
    // Auth cache (solo user id, non dati sensibili)
    auth: {
        userId: null
    }
};

// Stato in memoria
let state = deepClone(initialState);

// Helper per deep clone
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Carica stato da localStorage
function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge con initialState per garantire tutte le chiavi
            state = {
                ...deepClone(initialState),
                ...parsed,
                wizard: { ...deepClone(initialState.wizard), ...(parsed.wizard || {}) },
                inventory: { ...deepClone(initialState.inventory), ...(parsed.inventory || {}) },
                navigation: { ...deepClone(initialState.navigation), ...(parsed.navigation || {}) },
                auth: { ...deepClone(initialState.auth), ...(parsed.auth || {}) }
            };
        }
    } catch (e) {
        console.warn('[STORE] Failed to load state from localStorage', e);
    }
}

// Salva stato su localStorage
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('[STORE] Failed to save state to localStorage', e);
    }
}

// Carica navigation history separatamente (per performance)
function loadNavHistory() {
    try {
        const saved = localStorage.getItem(NAV_HISTORY_KEY);
        if (saved) {
            state.navigation.history = JSON.parse(saved) || [];
        }
    } catch (e) {
        console.warn('[STORE] Failed to load nav history', e);
    }
}

function saveNavHistory() {
    try {
        localStorage.setItem(NAV_HISTORY_KEY, JSON.stringify(state.navigation.history));
    } catch (e) {
        console.warn('[STORE] Failed to save nav history', e);
    }
}

// Inizializza store
loadState();
loadNavHistory();

// ===== API PUBBLICA =====

// --- WIZARD ---
export function getWizardState() {
    return deepClone(state.wizard);
}

export function setWizardState(updates) {
    state.wizard = { ...state.wizard, ...updates };
    saveState();
}

export function setWizardStep(step) {
    state.wizard.currentStep = step;
    saveState();
}

export function setWizardMold(mold) {
    state.wizard.selectedMold = mold ? { ...mold } : null;
    saveState();
}

export function setWizardWax(wax) {
    state.wizard.selectedWax = wax ? { ...wax } : null;
    saveState();
}

export function setWizardEssences(essences) {
    state.wizard.selectedEssences = essences ? essences.map(e => ({ ...e })) : [];
    saveState();
}

export function addWizardEssence(essence) {
    if (!essence) return;
    // Evita duplicati
    if (!state.wizard.selectedEssences.some(e => e.id === essence.id)) {
        state.wizard.selectedEssences.push({ ...essence });
        saveState();
    }
}

export function removeWizardEssence(essenceId) {
    state.wizard.selectedEssences = state.wizard.selectedEssences.filter(e => e.id !== essenceId);
    saveState();
}

export function setWizardFragrancePct(pct) {
    state.wizard.fragrancePct = pct;
    saveState();
}

export function setWizardCandleName(name) {
    state.wizard.candleName = name;
    saveState();
}

export function setWizardFragranceName(name) {
    state.wizard.fragranceName = name;
    saveState();
}

export function setWizardEditingLogId(logId) {
    state.wizard.editingLogId = logId;
    saveState();
}

export function resetWizard() {
    state.wizard = deepClone(initialState.wizard);
    saveState();
}

// --- INVENTORY ---
export function getInventoryTab() {
    return state.inventory.activeTab;
}

export function setInventoryTab(tab) {
    state.inventory.activeTab = tab;
    saveState();
}

// --- NAVIGATION ---
export function getNavigationHistory() {
    return [...state.navigation.history];
}

export function getCurrentPage() {
    return state.navigation.currentPage;
}

export function pushNavigation(page) {
    // Non aggiungere duplicati consecutivi
    if (state.navigation.history[state.navigation.history.length - 1] !== page) {
        state.navigation.history.push(page);
        // Limita lunghezza history
        if (state.navigation.history.length > 50) {
            state.navigation.history = state.navigation.history.slice(-30);
        }
    }
    state.navigation.currentPage = page;
    saveNavHistory();
    saveState();
}

export function popNavigation() {
    if (state.navigation.history.length > 1) {
        state.navigation.history.pop(); // rimuove la pagina corrente
        const prev = state.navigation.history[state.navigation.history.length - 1];
        state.navigation.currentPage = prev;
        saveNavHistory();
        saveState();
        return prev;
    }
    return null;
}

export function clearNavigationHistory() {
    state.navigation.history = [];
    saveNavHistory();
}

export function setCurrentPage(page) {
    state.navigation.currentPage = page;
    saveState();
}

// --- AUTH ---
export function getAuthUserId() {
    return state.auth.userId;
}

export function setAuthUserId(userId) {
    state.auth.userId = userId;
    saveState();
}

// --- RESET COMPLETO ---
export function resetAllState() {
    state = deepClone(initialState);
    saveState();
    localStorage.removeItem(NAV_HISTORY_KEY);
}

// --- DEBUG ---
export function getFullState() {
    return deepClone(state);
}

// Esponi globalmente per debug (opzionale)
if (typeof window !== 'undefined') {
    window.__CandleAppStore = {
        getFullState,
        resetAllState,
        getWizardState,
        resetWizard
    };
}
