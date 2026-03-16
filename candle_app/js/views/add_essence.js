// ===================================================
// ADD_ESSENCE.JS - Aggiungi elemento al magazzino
// ===================================================

import { supabase } from '../supabase.js';
import { createButton, createInput, createTitle } from '../components.js?v=3';

export async function renderAddEssence(container, categoryParam) {
    console.log('[VIEW] Rendering Add Essence, category:', categoryParam);
    try {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'register-wrapper';

        const category = categoryParam || 'Essenze';
        const isEssence = category === 'Essenze';
        const dbCategory = (category === 'Cere' ? 'wax' : category === 'Stampi' ? 'mold' : 'scent');

        const titleText = isEssence ? "Aggiungi un'essenza" : `Aggiungi ${category === 'Stampi' ? 'uno stampo' : 'una cera'}`;
        const title = createTitle(titleText, 2);
        title.classList.add('register-title');
        wrapper.appendChild(title);

        // Name
        const nameInput = createInput('Nome', 'text', 'add-name', 'Inserisci il nome');
        wrapper.appendChild(nameInput);

        // Family (only for essences)
        let familySelect = null;
        if (isEssence) {
            const { data: families } = await supabase.from('families').select('id, name_it').order('name_it');

            const famGroup = document.createElement('div');
            famGroup.className = 'input-group';
            const famLabel = document.createElement('label');
            famLabel.className = 'input-label';
            famLabel.textContent = 'Famiglia olfattiva';
            famGroup.appendChild(famLabel);

            familySelect = document.createElement('select');
            familySelect.className = 'input-field';
            familySelect.id = 'add-family';
            const opt0 = document.createElement('option');
            opt0.value = '';
            opt0.textContent = 'Seleziona famiglia';
            familySelect.appendChild(opt0);
            (families || []).forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.textContent = f.name_it || f.id;
                familySelect.appendChild(opt);
            });
            famGroup.appendChild(familySelect);
            wrapper.appendChild(famGroup);

            // Info note
            const infoNote = document.createElement('p');
            infoNote.className = 'form-note';
            infoNote.textContent = 'La famiglia della essenza è determinata dalla nota olfattiva che dona al prodotto.';
            wrapper.appendChild(infoNote);
        }

        // Quantity
        const qtyInput = createInput('Quantità (g)', 'number', 'add-qty', category === 'Stampi' ? 'Capacità in grammi' : 'Quantità in grammi');
        wrapper.appendChild(qtyInput);

        // Supplier
        const supplierInput = createInput('Venditore / Fornitore', 'text', 'add-supplier', 'Nome fornitore');
        wrapper.appendChild(supplierInput);

        // Save
        const btn = createButton('Salva', 'save', 'btn-primary');
        btn.onclick = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;
            if (!userId) { alert('Devi essere loggato!'); return; }

            const name = nameInput.querySelector('.input-field')?.value?.trim();
            if (!name) { alert('Inserisci un nome!'); return; }
            const quantity_g = parseFloat(qtyInput.querySelector('.input-field')?.value) || null;
            const supplier = supplierInput.querySelector('.input-field')?.value?.trim() || null;
            const family_id = familySelect?.value || null;

            const record = { user_id: userId, name, category: dbCategory, quantity_g, supplier };
            if (family_id) record.family_id = family_id;

            const { error } = await supabase.from('inventory').insert([record]);
            if (error) alert('Errore: ' + error.message);
            else window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
        };
        wrapper.appendChild(btn);

        container.appendChild(wrapper);
    } catch (e) {
        console.error('[VIEW] renderAddEssence error', e);
        container.innerHTML = `<h1>Errore nel caricamento</h1><pre>${e.message || e}</pre>`;
    }
}
