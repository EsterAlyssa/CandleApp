// ===================================================
// LOGIN.JS - Schermata di accesso (Custom Vercel Auth)
// ===================================================

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

        // --- FUNZIONE CENTRALE DI LOGIN CLASSICO ---
        const handleStandardLogin = async () => {
            const emailField = emailInput.querySelector('.input-field');
            if (!emailField) { alert('Input email non trovato'); return; }
            
            const email = emailField.value;
            const password = passwordInput.value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // Salviamo il token e l'utente nel browser (sostituisce Supabase Session)
                    localStorage.setItem('candle_token', data.token);
                    localStorage.setItem('candle_user', JSON.stringify(data.user));
                    window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
                } else {
                    alert('Errore: ' + data.error);
                }
            } catch (err) {
                console.error('Errore di rete:', err);
                alert('Impossibile connettersi al server.');
            }
        };

        // Bottone conferma
        const btnConfirm = createButton('Conferma', '', 'btn-primary btn-compact');
        if (!btnConfirm) {
            const fallback = document.createElement('button');
            fallback.className = 'btn btn-primary btn-compact login-confirm-btn';
            fallback.textContent = 'Conferma';
            fallback.style.width = 'auto';
            fallback.onclick = handleStandardLogin;
            wrapper.appendChild(fallback);
        } else {
            btnConfirm.classList.add('login-confirm-btn');
            btnConfirm.style.width = 'auto';
            btnConfirm.onclick = handleStandardLogin;
            wrapper.appendChild(btnConfirm);
        }

        // Link registrazione
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

        // --- INTEGRAZIONE GOOGLE CUSTOM BUTTON ---
        let googleClient;
        const initGoogleClient = () => {
            googleClient = google.accounts.oauth2.initTokenClient({
                client_id: '150422947747-s4c2ral5mtlbrk79rfa2i6jo70q790p5.apps.googleusercontent.com',
                scope: 'email profile',
                callback: async (response) => {
                    if (response.error) return; // L'utente ha chiuso il popup
                    
                    try {
                        const res = await fetch('/api/auth/google', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ access_token: response.access_token })
                        });
                        const data = await res.json();
                        if (res.ok) {
                            localStorage.setItem('candle_token', data.token);
                            localStorage.setItem('candle_user', JSON.stringify(data.user));
                            window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
                        } else alert('Errore Google: ' + data.error);
                    } catch (err) {
                        alert('Errore di connessione.');
                    }
                }
            });
        };

        const loadGoogleScript = () => {
            if (document.getElementById('google-gsi-script')) {
                initGoogleClient();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.id = 'google-gsi-script';
            script.async = true;
            script.defer = true;
            script.onload = initGoogleClient;
            document.body.appendChild(script);
        };

        loadGoogleScript();

        // Bentornato bottone personalizzato!
        const btnGoogle = createButton('Continua con Google', '', 'btn-google btn-compact');
        btnGoogle.onclick = () => {
            if (googleClient) googleClient.requestAccessToken();
            else alert('Caricamento in corso, riprova tra un secondo...');
        };
        wrapper.appendChild(btnGoogle);

        container.appendChild(wrapper);
    } catch (error) {
        console.error('[VIEW] renderLogin error', error);
        container.innerHTML = `<h1>Errore nel caricamento</h1><pre>${error?.message || String(error)}</pre>`;
    }
}