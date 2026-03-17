// ===================================================
// LANDING.JS - Pagina iniziale (Home 1)
// ===================================================

import { createLogo } from '../components.js?v=3';
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

    // Slider “Scorri per iniziare” (stile iOS)
    const startDiv = document.createElement('div');
    startDiv.className = 'landing-start-div';

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slide-start';

    const sliderLabel = document.createElement('span');
    sliderLabel.className = 'slide-label';
    sliderLabel.textContent = 'Scorri per iniziare';
    sliderContainer.appendChild(sliderLabel);

    const sliderTrack = document.createElement('div');
    sliderTrack.className = 'slide-track';

    const sliderThumb = document.createElement('div');
    sliderThumb.className = 'slide-thumb';
    sliderThumb.textContent = '»';
    sliderTrack.appendChild(sliderThumb);

    sliderContainer.appendChild(sliderTrack);
    startDiv.appendChild(sliderContainer);
    wrapper.appendChild(startDiv);

    // Drag behavior
    let dragging = false;
    let startX = 0;
    let startLeft = 0;

    sliderThumb.addEventListener('pointerdown', (e) => {
        dragging = true;
        startX = e.clientX;
        startLeft = sliderThumb.offsetLeft;
        sliderThumb.setPointerCapture(e.pointerId);
    });

    sliderThumb.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const delta = e.clientX - startX;
        const trackWidth = sliderTrack.clientWidth - sliderThumb.offsetWidth;
        let next = Math.min(Math.max(0, startLeft + delta), trackWidth);
        sliderThumb.style.left = `${next}px`;
        if (next >= trackWidth) {
            triggerStart();
            setTimeout(() => {
                sliderThumb.style.left = '0px';
            }, 250);
        }
    });

    const stopDrag = () => {
        dragging = false;
        sliderThumb.style.left = '0px';
    };
    sliderThumb.addEventListener('pointerup', stopDrag);
    sliderThumb.addEventListener('pointercancel', stopDrag);

    async function triggerStart() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
        else window.dispatchEvent(new CustomEvent('navigate', { detail: 'login' }));
    }

    container.appendChild(wrapper);
}