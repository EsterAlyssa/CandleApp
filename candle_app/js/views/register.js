// ===================================================
// REGISTER.JS - Schermata di registrazione (Custom Vercel Auth)
// ===================================================

import { createButton, createInput, createTitle, createIconButton } from '../components.js?v=3';

export function renderRegister(container) {
    console.log('[VIEW] Rendering Register...');
    
    const wrapper = document.createElement('div');
    wrapper.className = 'register-wrapper';

    // Back icon
    const backDiv = document.createElement('div');
    backDiv.className = 'register-back-div';
    const backBtn = createIconButton('reply', 'square');
    backBtn.onclick = () => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'login' }));
    };
    backDiv.appendChild(backBtn);
    wrapper.appendChild(backDiv);

    // Titolo
    const title = createTitle('Registrazione', 2);
    title.classList.add('register-title');
    wrapper.appendChild(title);

    // Input nome
    const nameInput = createInput('Nome', 'text', 'reg-name', 'Inserisci il tuo nome');
    wrapper.appendChild(nameInput);

    // Input email
    const emailInput = createInput('Email', 'email', 'reg-email', 'Inserisci la tua email');
    wrapper.appendChild(emailInput);

    // Input password con icona
    const passwordGroup = document.createElement('div');
    passwordGroup.className = 'input-group register-password-group';
    const passwordLabel = document.createElement('label');
    passwordLabel.className = 'input-label';
    passwordLabel.textContent = 'Password';
    passwordGroup.appendChild(passwordLabel);
    
    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.id = 'reg-password';
    passwordInput.className = 'input-field';
    passwordInput.placeholder = 'Inserisci la tua password';
    passwordGroup.appendChild(passwordInput);
    
    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'material-symbols-outlined register-toggle-icon';
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

    // Input conferma password
    const confirmGroup = document.createElement('div');
    confirmGroup.className = 'input-group register-confirm-group';
    const confirmLabel = document.createElement('label');
    confirmLabel.className = 'input-label';
    confirmLabel.textContent = 'Conferma Password';
    confirmGroup.appendChild(confirmLabel);
    
    const confirmInput = document.createElement('input');
    confirmInput.type = 'password';
    confirmInput.id = 'reg-confirm';
    confirmInput.className = 'input-field';
    confirmInput.placeholder = 'Conferma la tua password';
    confirmGroup.appendChild(confirmInput);
    
    const toggleIcon2 = document.createElement('span');
    toggleIcon2.className = 'material-symbols-outlined register-toggle-icon';
    toggleIcon2.textContent = 'visibility';
    toggleIcon2.onclick = () => {
        if (confirmInput.type === 'password') {
            confirmInput.type = 'text';
            toggleIcon2.textContent = 'visibility_off';
        } else {
            confirmInput.type = 'password';
            toggleIcon2.textContent = 'visibility';
        }
    };
    confirmGroup.appendChild(toggleIcon2);
    wrapper.appendChild(confirmGroup);

    // --- FUNZIONE DI REGISTRAZIONE ---
    const btnConfirm = createButton('Conferma', '', 'btn-primary btn-compact');
    btnConfirm.onclick = async () => {
        const name = nameInput.querySelector('.input-field').value;
        const email = emailInput.querySelector('.input-field').value;
        const password = passwordInput.value;
        const confirm = confirmInput.value;
        
        if (!email || !password) {
            alert('Compila tutti i campi!');
            return;
        }
        if (password !== confirm) {
            alert('Le password non coincidono!');
            return;
        }
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Registrazione avvenuta con successo!');
                // Auto-login: salviamo subito il token e andiamo alla dashboard
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
    wrapper.appendChild(btnConfirm);

    // Separatore
    const separator = document.createElement('p');
    separator.className = 'register-google-text';
    separator.innerHTML = 'Oppure registrati con il tuo<br>account Google!';
    wrapper.appendChild(separator);

    // --- INTEGRAZIONE GOOGLE LOGIN NATIVO ---
    const googleBtnContainer = document.createElement('div');
    googleBtnContainer.id = 'google-register-btn-container';
    googleBtnContainer.style.display = 'flex';
    googleBtnContainer.style.justifyContent = 'center';
    googleBtnContainer.style.marginTop = '10px';
    wrapper.appendChild(googleBtnContainer);

    window.handleGoogleRegisterResponse = async (response) => {
        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                localStorage.setItem('candle_token', data.token);
                localStorage.setItem('candle_user', JSON.stringify(data.user));
                window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
            } else {
                alert('Errore Google Auth: ' + data.error);
            }
        } catch (err) {
            console.error('Errore di rete Google Auth:', err);
            alert('Errore di connessione durante l\'accesso con Google.');
        }
    };

    const loadGoogleScript = () => {
        if (document.getElementById('google-gsi-script')) {
            renderGoogleButton();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.id = 'google-gsi-script';
        script.async = true;
        script.defer = true;
        script.onload = renderGoogleButton;
        document.body.appendChild(script);
    };

    const renderGoogleButton = () => {
        google.accounts.id.initialize({
            client_id: '150422947747-s4c2ral5mtlbrk79rfa2i6jo70q790p5.apps.googleusercontent.com',
            callback: window.handleGoogleRegisterResponse
        });
        google.accounts.id.renderButton(
            document.getElementById('google-register-btn-container'),
            { theme: 'outline', size: 'large', type: 'standard', text: 'signup_with' }
        );
    };

    loadGoogleScript();

    container.appendChild(wrapper);
}