// ===================================================
// LOGIN.JS - Schermata di accesso
// ===================================================

import { supabase } from '../supabase.js';
import { createButton, createInput, createTitle, createIconButton } from '../components.js?v=3';

export function renderLogin(container) {
    console.log('[VIEW] Rendering Login...');
    try {
        const wrapper = document.createElement('div');
        wrapper.className = 'login-wrapper';

    // Home icon
    const homeDiv = document.createElement('div');
    homeDiv.className = 'login-home-div';
    const homeBtn = createIconButton('home', 'square');
    homeBtn.onclick = () => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'landing' }));
    };
    homeDiv.appendChild(homeBtn);
    wrapper.appendChild(homeDiv);

    // Titolo
    const title = createTitle('Login', 2);
    title.classList.add('login-title');
    wrapper.appendChild(title);

    // Input email
    const emailInput = createInput('Email', 'email', 'email', 'Inserisci la tua email');
    wrapper.appendChild(emailInput);

    // Input password con icona toggle
    const passwordGroup = document.createElement('div');
    passwordGroup.className = 'input-group login-password-group';
    const passwordLabel = document.createElement('label');
    passwordLabel.className = 'input-label';
    passwordLabel.textContent = 'Password';
    passwordGroup.appendChild(passwordLabel);
    
    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.id = 'password';
    passwordInput.className = 'input-field';
    passwordInput.placeholder = 'Inserisci la tua password';
    passwordGroup.appendChild(passwordInput);
    
    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'material-symbols-outlined login-toggle-icon';
    toggleIcon.textContent = 'visibility';
    toggleIcon.onclick = () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.textContent = 'visibility_off';
        } else {
            passwordInput.type = 'password';
            toggleIcon.textContent = 'visibility';
        }
    };
    passwordGroup.appendChild(toggleIcon);
    wrapper.appendChild(passwordGroup);

    // Bottone conferma
    const btnConfirm = createButton('Conferma', '', 'btn-primary btn-compact');
    console.log('[LOGIN] btnConfirm element:', btnConfirm);
    if (!btnConfirm) {
        console.error('[LOGIN] createButton("Conferma") returned null — creating fallback button');
        const fallback = document.createElement('button');
        fallback.className = 'btn btn-primary btn-compact login-confirm-btn';
        fallback.textContent = 'Conferma';
        fallback.onclick = async () => {
            const emailField = emailInput.querySelector('.input-field');
            if (!emailField) { alert('Input email non trovato'); return; }
            const email = emailField.value;
            const password = passwordInput.value;
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) alert('Errore: ' + error.message);
            else window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
        };
        // ensure visual parity with created buttons
        fallback.style.width = 'auto';
        wrapper.appendChild(fallback);
    } else {
        btnConfirm.classList.add('login-confirm-btn');
        // in our centered layout compact button should not be full width
        btnConfirm.style.width = 'auto';
        btnConfirm.onclick = async () => {
            const emailField = emailInput.querySelector('.input-field');
            if (!emailField) { alert('Input email non trovato'); return; }
            const email = emailField.value;
            const password = passwordInput.value;
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) alert('Errore: ' + error.message);
            else window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
        };
        wrapper.appendChild(btnConfirm);
    }

    // Link registrazione (pulsante compatto come mockup)
    const registerDiv = document.createElement('div');
    registerDiv.className = 'login-register-div';
    const registerText = document.createElement('span');
    registerText.textContent = 'Se ancora non hai un account, registrati:';
    registerDiv.appendChild(registerText);
    const registerBtn = createButton('Registrati', '', 'btn-primary btn-compact');
    registerBtn.onclick = () => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'register' }));
    };
    registerDiv.appendChild(registerBtn);
    wrapper.appendChild(registerDiv);

    // Separatore
    const separator = document.createElement('div');
    separator.className = 'login-separator';
    separator.textContent = 'oppure';
    wrapper.appendChild(separator);

    // Bottone Google
    const btnGoogle = createButton('Google', '', 'btn-google btn-compact');
    console.log('[LOGIN] btnGoogle element:', btnGoogle);
    if (!btnGoogle) {
        console.error('[LOGIN] createButton("Continua con Google") returned null — creating fallback button');
        const fallbackG = document.createElement('button');
        fallbackG.className = 'btn btn-google';
        fallbackG.textContent = 'Continua con Google';
        fallbackG.onclick = async () => {
            const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
            if (error) alert('Errore: ' + error.message);
        };
        wrapper.appendChild(fallbackG);
    } else {
        btnGoogle.onclick = async () => {
            const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
            if (error) alert('Errore: ' + error.message);
        };
        wrapper.appendChild(btnGoogle);
    }

    container.appendChild(wrapper);
    } catch (error) {
        console.error('[VIEW] renderLogin error', error);
        container.innerHTML = `<h1>Errore nel caricamento</h1><pre>${error?.message || String(error)}</pre>`;
    }
}
