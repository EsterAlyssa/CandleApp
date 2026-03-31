// ===================================================
// COMPONENTS.JS - Sistema di Componenti Modulari (v3)
// ===================================================
console.log('[COMPONENTS] components.js v3 loaded');

// Funzione helper per trasformare HTML string in elemento DOM
function htmlToElement(html) {
    console.log('[COMPONENTS] htmlToElement input:', html);
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstChild;
    console.log('[COMPONENTS] htmlToElement result:', el, 'children:', template.content.children.length);
    if (!el) {
        console.error('[COMPONENTS] htmlToElement failed to parse HTML:', html);
    }
    return el;
}

// ===== TITOLO =====
export function createTitle(text, level = 2) {
    console.log('[COMPONENTS] createTitle called with:', { text, level });
    // Creazione manuale più robusta
    try {
        const el = document.createElement('h' + level);
        el.className = 'title';
        el.textContent = text;
        console.log('[COMPONENTS] createTitle manual result:', el);
        return el;
    } catch (e) {
        console.error('[COMPONENTS] createTitle fallback failed', e);
        // Ultimo tentativo con htmlToElement
        const result = htmlToElement(`<h${level} class="title">${text}</h${level}>`);
        console.log('[COMPONENTS] createTitle htmlToElement result:', result);
        return result;
    }
}

// ===== BOTTONE =====
// Varianti supportate: 'primary', 'outline', 'danger', 'ghost'
// Sizes: 'sm', 'lg'
// Modificatori: 'full' (full width)
export function createButton(label, icon = '', variant = 'outline') {
    console.log('[COMPONENTS] createButton called with:', { label, icon, variant });
    
    // Parse variant string - può contenere multiple classi separate da spazio
    // Es: "primary lg full", "outline sm", "danger"
    const variants = variant.split(' ').filter(Boolean);
    let classes = ['app-btn'];
    
    // Map legacy class names to new system
    const legacyMap = {
        'btn-primary': 'app-btn-primary app-btn-lg app-btn-full',
        'btn-secondary': 'app-btn-outline',
        'btn-card-edit': 'app-btn-outline',
        'btn-card-delete': 'app-btn-danger',
        'outline': 'app-btn-outline',
        'outline-red': 'app-btn-danger'
    };
    
    variants.forEach(v => {
        if (legacyMap[v]) {
            classes.push(...legacyMap[v].split(' '));
        } else if (v === 'primary' || v === 'outline' || v === 'danger' || v === 'ghost') {
            classes.push(`app-btn-${v}`);
        } else if (v === 'sm' || v === 'lg') {
            classes.push(`app-btn-${v}`);
        } else if (v === 'full') {
            classes.push('app-btn-full');
        } else {
            // Keep unknown classes for backward compatibility
            classes.push(v);
        }
    });
    
    const className = [...new Set(classes)].join(' ');
    
    const iconHtml = icon ? `<span class="material-symbols-outlined btn-icon">${icon}</span>` : '';
    const html = `
        <button class="${className}">
            ${iconHtml}
            <span class="btn-label">${label}</span>
        </button>
    `;
    const el = htmlToElement(html);
    console.log('[COMPONENTS] createButton htmlToElement result:', el);
    if (el) return el;

    // Fallback manual
    try {
        console.log('[COMPONENTS] createButton using fallback');
        const btn = document.createElement('button');
        btn.className = className;
        if (icon) {
            const ic = document.createElement('span');
            ic.className = 'material-symbols-outlined btn-icon';
            ic.textContent = icon;
            btn.appendChild(ic);
        }
        const lbl = document.createElement('span');
        lbl.className = 'btn-label';
        lbl.textContent = label;
        btn.appendChild(lbl);
        console.log('[COMPONENTS] createButton fallback result:', btn);
        return btn;
    } catch (e) {
        console.error('[COMPONENTS] createButton fallback failed', e, { label, icon, variant });
        return null;
    }
}

// ===== INPUT =====
export function createInput(label, type = 'text', id = '', placeholder = '') {
    const inputId = id || `input-${Date.now()}`;
    const el = htmlToElement(`
        <div class="input-group">
            <label class="input-label" for="${inputId}">${label}</label>
            <input class="input-field" type="${type}" id="${inputId}" placeholder="${placeholder}" />
        </div>
    `);
    if (el) return el;

    // Fallback manual
    try {
        const group = document.createElement('div');
        group.className = 'input-group';
        const lab = document.createElement('label');
        lab.className = 'input-label';
        lab.htmlFor = inputId;
        lab.textContent = label;
        const input = document.createElement('input');
        input.className = 'input-field';
        input.type = type;
        input.id = inputId;
        input.placeholder = placeholder;
        group.appendChild(lab);
        group.appendChild(input);
        return group;
    } catch (e) {
        console.error('[COMPONENTS] createInput fallback failed', e, { label, type, id, placeholder });
        return null;
    }
}

// ===== CARD =====
export function createCard(title, contentHTML, actions = []) {
    let cardElement = htmlToElement(`
        <div class="card">
            <div class="card-title">${title}</div>
            <div class="card-content">${contentHTML}</div>
            <div class="card-actions"></div>
        </div>
    `);

    if (!cardElement) {
        // Fallback manual
        try {
            cardElement = document.createElement('div');
            cardElement.className = 'card';
            const t = document.createElement('div');
            t.className = 'card-title';
            t.textContent = title;
            const c = document.createElement('div');
            c.className = 'card-content';
            c.innerHTML = contentHTML;
            const a = document.createElement('div');
            a.className = 'card-actions';
            cardElement.appendChild(t);
            cardElement.appendChild(c);
            cardElement.appendChild(a);
        } catch (e) {
            console.error('[COMPONENTS] createCard fallback failed', e, { title, contentHTML });
            return null;
        }
    }

    if (actions.length > 0) {
        const actionsContainer = cardElement.querySelector('.card-actions');
        actions.forEach(btn => actionsContainer.appendChild(btn));
    }

    return cardElement;
}

// ===== LOGO =====
export function createLogo(src = '/assets/logo.png', size = 'large') {
    console.log('[COMPONENTS] createLogo', { src, size });
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Logo CandleApp';
    img.className = 'logo-img';
    if (size === 'small') img.classList.add('small');
    return img;
}

// ===== ALERT =====
export function createAlert(text, variant = 'info') {
    console.log('[COMPONENTS] createAlert', { text, variant });
    const box = document.createElement('div');
    box.className = `alert-box ${variant}`;
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = variant === 'warning' ? 'warning' : 'info';
    box.appendChild(icon);
    const txt = document.createElement('div');
    txt.className = 'alert-text';
    txt.textContent = text;
    box.appendChild(txt);
    return box;
}

// ===== START BUTTON =====
export function createStartButton(label = 'Scorri per iniziare') {
    console.log('[COMPONENTS] createStartButton', { label });
    const btn = document.createElement('button');
    btn.className = 'btn-start';
    btn.innerHTML = `<span class="material-symbols-outlined">double_arrow</span> ${label}`;
    return btn;
}

// ===== ICON BUTTON =====
export function createIconButton(iconName, extraClass = '') {
    const btn = document.createElement('button');
    btn.className = `icon-btn ${extraClass}`.trim();
    const span = document.createElement('span');
    span.className = 'material-symbols-outlined';
    span.textContent = iconName;
    btn.appendChild(span);
    return btn;
}