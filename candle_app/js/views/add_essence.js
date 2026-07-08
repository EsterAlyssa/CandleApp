// ===================================================
// ADD_ESSENCE.JS - Aggiungi elemento al magazzino
// ===================================================

import { supabase } from '../supabase.js';
import { createButton, createInput, createTitle } from '../components.js?v=3';
import { buildImageRef, buildImageUrl, getImageUrlFromRecord, uploadImageToCloudinary, deleteImageFromCloudinary, deleteImageByPublicId } from '../image.js?v=5';
import { WAX_PRESETS, SCENT_PRESETS, findWaxPreset, findScentPreset } from '../presets.js';
import * as Store from '../store.js';

export async function renderAddEssence(container, categoryParam) {
    console.log('[VIEW] Rendering Add Essence, categoryParam:', categoryParam);
    try {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'register-wrapper';

        // Parse category + optional edit id (e.g. "Essenze&id=<uuid>")
        let rawCategory = categoryParam || 'Essenze';
        let editId = null;
        if (rawCategory.includes('&')) {
            const parts = rawCategory.split('&');
            rawCategory = parts[0] || 'Essenze';
            parts.slice(1).forEach(p => {
                const [k, v] = p.split('=');
                if (k === 'id' && v) editId = v;
            });
        }

        const category = rawCategory.trim();
        const catLower = category.toLowerCase();
        const isEssence = catLower === 'essenze';
        const dbCategory = catLower === 'cere' ? 'wax' : catLower === 'stampi' ? 'mold' : 'scent';

        const isEdit = Boolean(editId);
        const titleText = isEdit
            ? `Modifica ${isEssence ? "essenza" : (category === 'Stampi' ? 'stampo' : 'cera')}`
            : isEssence
                ? "Aggiungi un'essenza"
                : `Aggiungi ${category === 'Stampi' ? 'uno stampo' : 'una cera'}`;
        const title = createTitle(titleText, 2);
        title.classList.add('register-title');
        wrapper.appendChild(title);

        // Name
        const nameInput = createInput('Nome', 'text', 'add-name', 'Inserisci il nome');
        wrapper.appendChild(nameInput);
        const nameField = nameInput.querySelector('.input-field');

        // Datalist con suggerimenti preimpostati (cere o essenze)
        const presetList = dbCategory === 'wax' ? WAX_PRESETS : dbCategory === 'scent' ? SCENT_PRESETS : [];
        if (presetList.length > 0 && nameField) {
            const datalistId = 'preset-suggestions';
            const datalist = document.createElement('datalist');
            datalist.id = datalistId;
            presetList.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.name;
                datalist.appendChild(opt);
            });
            wrapper.appendChild(datalist);
            nameField.setAttribute('list', datalistId);
            const presetHint = document.createElement('p');
            presetHint.className = 'form-note';
            presetHint.textContent = dbCategory === 'wax'
                ? 'Scegli un tipo di cera dai suggerimenti per compilare in automatico i dati tecnici (modificabili).'
                : 'Scegli un\'essenza dai suggerimenti per compilare in automatico famiglia e nota (modificabili).';
            nameInput.appendChild(presetHint);
        }

        // Nota olfattiva (solo per essenze): testa / cuore / fondo
        let noteTypeSelect = null;
        if (rawCategory.trim().toLowerCase() === 'essenze') {
            const noteGroup = document.createElement('div');
            noteGroup.className = 'input-group';
            const noteLabel = document.createElement('label');
            noteLabel.className = 'input-label';
            noteLabel.textContent = 'Nota olfattiva';
            noteGroup.appendChild(noteLabel);

            noteTypeSelect = document.createElement('select');
            noteTypeSelect.className = 'input-field';
            noteTypeSelect.id = 'add-note-type';
            [
                { v: '', t: 'Seleziona nota' },
                { v: 'head', t: 'Di testa' },
                { v: 'heart', t: 'Di cuore' },
                { v: 'base', t: 'Di fondo' }
            ].forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.v;
                opt.textContent = o.t;
                noteTypeSelect.appendChild(opt);
            });
            noteGroup.appendChild(noteTypeSelect);
            wrapper.appendChild(noteGroup);
        }

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

        // Dati tecnici cera (solo per le cere)
        let waxFields = null;
        if (dbCategory === 'wax') {
            const makeNum = (label, id, placeholder, step) => {
                const grp = createInput(label, 'number', id, placeholder);
                const f = grp.querySelector('.input-field');
                if (step) f.setAttribute('step', step);
                wrapper.appendChild(grp);
                return f;
            };
            const cf = makeNum('Coefficiente di conversione', 'add-cf', 'es. 0.90 (densità rispetto all\'acqua)', '0.01');
            const mt = makeNum('Temperatura di fusione (°C)', 'add-melt', 'es. 52', '1');
            const pt = makeNum('Temperatura di versata (°C)', 'add-pour', 'es. 62', '1');
            const mf = makeNum('Carico max fragranza (%)', 'add-maxfrag', 'es. 10', '0.5');
            waxFields = { conversion_factor: cf, melt_temp: mt, pour_temp: pt, max_fragrance: mf };
        }

        // Upload immagine per tutte le categorie (stampi, cere, essenze)
        let selectedImageFile = null;
        let existingImageRef = null;
        let existingTechData = null;
        let imgPreview = null;

        // Aggiungi sezione upload immagine
        const imgGroup = document.createElement('div');
        imgGroup.className = 'input-group';
        const imgLabel = document.createElement('label');
        imgLabel.className = 'input-label';
        imgLabel.textContent = `Foto ${isEssence ? 'essenza' : (category === 'Stampi' ? 'stampo' : 'cera')} (opzionale)`;
        imgGroup.appendChild(imgLabel);

        const imgInput = document.createElement('input');
        imgInput.type = 'file';
        imgInput.accept = 'image/*';
        imgInput.capture = 'environment';
        imgInput.className = 'input-field';
        imgGroup.appendChild(imgInput);

        imgPreview = document.createElement('img');
        imgPreview.style = 'max-width: 160px; max-height: 160px; margin-top: 10px; border-radius: 12px; display: none;';
        imgGroup.appendChild(imgPreview);

        imgInput.onchange = (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            selectedImageFile = file;
            imgPreview.src = URL.createObjectURL(file);
            imgPreview.style.display = 'block';
        };

        wrapper.appendChild(imgGroup);

        // Supplier
        const supplierInput = createInput('Venditore / Fornitore', 'text', 'add-supplier', 'Nome fornitore');
        wrapper.appendChild(supplierInput);

        // Precompilazione dai preset quando si sceglie/scrive un nome noto
        if (nameField && (dbCategory === 'wax' || dbCategory === 'scent')) {
            const applyPreset = () => {
                const val = nameField.value;
                if (dbCategory === 'wax' && waxFields) {
                    const preset = findWaxPreset(val);
                    if (!preset) return;
                    const td = preset.tech_data || {};
                    if (td.conversion_factor != null) waxFields.conversion_factor.value = td.conversion_factor;
                    if (td.melt_temp != null) waxFields.melt_temp.value = td.melt_temp;
                    if (td.pour_temp != null) waxFields.pour_temp.value = td.pour_temp;
                    if (td.max_fragrance != null) waxFields.max_fragrance.value = td.max_fragrance;
                } else if (dbCategory === 'scent') {
                    const preset = findScentPreset(val);
                    if (!preset) return;
                    if (noteTypeSelect && preset.note) noteTypeSelect.value = preset.note;
                    if (familySelect && preset.family_id) {
                        // Seleziona la famiglia solo se esiste tra quelle dell'utente
                        const hasOption = Array.from(familySelect.options).some(o => o.value === preset.family_id);
                        if (hasOption) familySelect.value = preset.family_id;
                    }
                }
            };
            nameField.addEventListener('change', applyPreset);
            nameField.addEventListener('input', applyPreset);
        }

        // Load existing item when in edit mode
        if (isEdit) {
            const { data: existing, error: existingError } = await supabase.from('inventory').select('id, user_id, name, category, quantity_g, supplier, family_id, tech_data, image_ref').eq('id', editId).maybeSingle();
            if (!existingError && existing) {
                // Only prefill if category matches expected
                if (existing.category === dbCategory) {
                    nameInput.querySelector('.input-field').value = existing.name || '';
                    qtyInput.querySelector('.input-field').value = existing.quantity_g != null ? existing.quantity_g : '';
                    supplierInput.querySelector('.input-field').value = existing.supplier || '';
                    if (familySelect && existing.family_id) {
                        familySelect.value = existing.family_id;
                    }
                    if (noteTypeSelect && existing.tech_data?.note_type) {
                        noteTypeSelect.value = existing.tech_data.note_type;
                    }
                    if (waxFields && existing.tech_data) {
                        const td = existing.tech_data;
                        if (td.conversion_factor != null) waxFields.conversion_factor.value = td.conversion_factor;
                        if (td.melt_temp != null) waxFields.melt_temp.value = td.melt_temp;
                        if (td.pour_temp != null) waxFields.pour_temp.value = td.pour_temp;
                        if (td.max_fragrance != null) waxFields.max_fragrance.value = td.max_fragrance;
                    }

                    // Keep existing image ref so we do not lose it when editing
                    existingImageRef = existing.image_ref || existing.image_url || null;
                    existingTechData = existing.tech_data || null;
                    const existingUrl = getImageUrlFromRecord(existing);
                    if (existingUrl && imgPreview) {
                        imgPreview.src = existingUrl;
                        imgPreview.style.display = 'block';
                    }
                } else {
                    console.warn('[ADD_ESSENCE] editId category mismatch', { expected: dbCategory, actual: existing.category });
                }
            }
        }

        // Save
        const btn = createButton('Salva', 'save', 'btn-primary');
        btn.style.flex = '1';
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

            // Store only the image reference in Supabase (image_ref = category + '_' + dynamicPart)
            // The full URL is computed at runtime from the base Cloudinary URL.
            // Gestisce upload immagini per tutte le categorie (stampi, cere, essenze)
            if (selectedImageFile) {
                const existingDeleteToken = existingTechData?.cloudinary_delete_token;
                const existingPublicId = existingTechData?.cloudinary_public_id;
                console.log('[ADD_ESSENCE] existing image delete check', { existingDeleteToken, existingPublicId });

                if (existingDeleteToken) {
                    try {
                        await deleteImageFromCloudinary(existingDeleteToken);
                    } catch (deleteErr) {
                        console.warn('[ADD_ESSENCE] Failed to delete previous image via Cloudinary token', deleteErr);
                    }
                } else {
                    const previousPublicId = existingPublicId || existingImageRef;
                    if (previousPublicId) {
                        try {
                            await deleteImageByPublicId(previousPublicId);
                        } catch (deleteErr) {
                            console.warn('[ADD_ESSENCE] Failed to delete previous image via public_id endpoint', deleteErr);
                        }
                    }
                }

                try {
                    const { imageRef, cloudinaryPublicId, deleteToken, version } = await uploadImageToCloudinary(selectedImageFile, dbCategory, name);
                    existingImageRef = imageRef;
                    existingTechData = existingTechData || {};
                    if (cloudinaryPublicId) {
                        existingTechData.cloudinary_public_id = cloudinaryPublicId;
                    }
                    if (deleteToken) {
                        existingTechData.cloudinary_delete_token = deleteToken;
                    }
                    if (version) {
                        existingTechData.cloudinary_version = version;
                    }
                } catch (uploadError) {
                    console.error('[ADD_ESSENCE] uploadImageToCloudinary failed', uploadError);
                    alert(`Upload immagine fallito: ${uploadError?.message || uploadError}`);
                    return;
                }
            }
            
            // Nota olfattiva (solo essenze): salvala in tech_data.note_type
            if (noteTypeSelect) {
                const nt = noteTypeSelect.value || '';
                existingTechData = existingTechData || {};
                if (nt) existingTechData.note_type = nt;
                else delete existingTechData.note_type;
            }

            // Dati tecnici cera: salvali in tech_data
            if (waxFields) {
                existingTechData = existingTechData || {};
                const setNum = (key, field) => {
                    const raw = field.value;
                    if (raw === '' || raw == null) { delete existingTechData[key]; return; }
                    const num = parseFloat(raw);
                    if (Number.isNaN(num)) delete existingTechData[key];
                    else existingTechData[key] = num;
                };
                setNum('conversion_factor', waxFields.conversion_factor);
                setNum('melt_temp', waxFields.melt_temp);
                setNum('pour_temp', waxFields.pour_temp);
                setNum('max_fragrance', waxFields.max_fragrance);
            }

            // Update record with new image info (or keep existing if no new image chosen).
            if (existingImageRef) {
                record.image_ref = existingImageRef;
            }
            if (existingTechData && Object.keys(existingTechData).length > 0) {
                record.tech_data = existingTechData;
            }

            if (!['wax','mold','scent'].includes(dbCategory)) {
                console.error('[ADD_ESSENCE] Invalid category for inventory:', dbCategory, { category, categoryParam });
                alert('Categoria non valida: ' + dbCategory);
                return;
            }

            console.log('[ADD_ESSENCE] inserting inventory record', record);
            let error;
            if (isEdit && editId) {
                const res = await supabase.from('inventory').update(record).eq('id', editId);
                error = res.error;
            } else {
                const res = await supabase.from('inventory').insert([record]);
                error = res.error;
            }

            if (error) alert('Errore: ' + error.message);
            else {
                const tabByCategory = { wax: 'Cere', mold: 'Stampi', scent: 'Essenze' };
                Store.setInventoryTab(tabByCategory[dbCategory] || 'Cere');
                window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
            }
        };

        const cancelBtn = createButton('Annulla', 'close', 'btn-secondary');
        cancelBtn.style.flex = '1';
        cancelBtn.onclick = () => {
            // Always go back to inventory, regardless of edit/create mode
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
        };

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '8px';
        btnContainer.style.marginTop = '16px';
        btnContainer.appendChild(btn);
        btnContainer.appendChild(cancelBtn);

        wrapper.appendChild(btnContainer);

        container.appendChild(wrapper);
    } catch (e) {
        console.error('[VIEW] renderAddEssence error', e);
        container.innerHTML = `<h1>Errore nel caricamento</h1><pre>${e.message || e}</pre>`;
    }
}
