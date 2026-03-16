// ===================================================
// LANDING.JS - Pagina iniziale (Home 1)
// ===================================================

import { createLogo, createStartButton } from '../components.js?v=3';
import { supabase } from '../supabase.js';

export async function renderLanding(container) {
    console.log('[VIEW] Rendering Landing...');
    
    const wrapper = document.createElement('div');
    wrapper.className = 'landing-wrapper';

    // Login link (top right) - only show in-page Log In when logged out (logout is shown in the top bar)
    const loginDiv = document.createElement('div');
    loginDiv.className = 'landing-login-div';
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            const loginBtn = document.createElement('button');
            loginBtn.className = 'btn-link landing-login-btn';
            loginBtn.textContent = 'Log In';
            loginBtn.onclick = () => {
                window.dispatchEvent(new CustomEvent('navigate', { detail: 'login' }));
            };
            loginDiv.appendChild(loginBtn);
        }
    } catch (e) {
        console.warn('[LANDING] could not check session', e);
        const loginBtn = document.createElement('button');
        loginBtn.className = 'btn-link landing-login-btn';
        loginBtn.textContent = 'Log In';
        loginBtn.onclick = () => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'login' }));
        };
        loginDiv.appendChild(loginBtn);
    }
    wrapper.appendChild(loginDiv);

    // Titolo
    const title = document.createElement('h1');
    title.className = 'landing-title';
    title.textContent = 'CandleApp';
    wrapper.appendChild(title);

    // Logo (component)
    const logoImg = createLogo('/assets/logo.png', 'large');
    wrapper.appendChild(logoImg);

    // Sottotitolo
    const subtitle = document.createElement('h2');
    subtitle.className = 'landing-subtitle';
    subtitle.innerHTML = "L'app per gestire le tue<br>candele!";
    wrapper.appendChild(subtitle);

    // Bottone start + slider "scorri"
    const startDiv = document.createElement('div');
    startDiv.className = 'landing-start-div';

    const startBtn = createStartButton('Scorri per iniziare');
    startBtn.onclick = triggerStart;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = '0';
    slider.className = 'landing-slider';
    slider.oninput = () => {
        if (slider.value === slider.max) {
            triggerStart();
            setTimeout(() => { slider.value = '0'; }, 300);
        }
    };

    startDiv.appendChild(startBtn);
    startDiv.appendChild(slider);
    wrapper.appendChild(startDiv);

    async function triggerStart() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
        else window.dispatchEvent(new CustomEvent('navigate', { detail: 'login' }));
    }

    container.appendChild(wrapper);
}