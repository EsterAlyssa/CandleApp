// ===================================================
// REGISTER.JS - Schermata di registrazione
// ===================================================

import { supabase } from '../supabase.js';
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

    // Bottone conferma
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
        
        const { error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: { data: { full_name: name } }
        });
        
        if (error) {
            alert('Errore: ' + error.message);
        } else {
            alert('Registrazione avvenuta!');
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'login' }));
        }
    };
    wrapper.appendChild(btnConfirm);

    // Separatore
    const separator = document.createElement('p');
    separator.className = 'register-google-text';
    separator.innerHTML = 'Oppure registrati con il tuo<br>account Google!';
    wrapper.appendChild(separator);

    // Bottone Google
    const btnGoogle = createButton('Google', '', 'btn-google btn-compact');
    btnGoogle.onclick = async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) alert('Errore: ' + error.message);
    };
    wrapper.appendChild(btnGoogle);

    container.appendChild(wrapper);
}
