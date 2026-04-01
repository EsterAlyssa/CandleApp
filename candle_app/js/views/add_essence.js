// ===================================================
// ADD_ESSENCE.JS - Aggiungi elemento al magazzino
// ===================================================

import { supabase } from '../supabase.js';
import { createButton, createInput, createTitle } from '../components.js?v=3';
import { buildImageRef, buildImageUrl, getImageUrlFromRecord, uploadImageToCloudinary, deleteImageFromCloudinary } from '../image.js?v=4';

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

        // Debug Cloudinary button (temporary)
        if (!isEdit) {
            const debugBtn = createButton('🐛 Test Cloudinary Config', '', 'outline');
            debugBtn.onclick = async () => {
                const { getCloudinaryUploadConfig } = await import('../env.js?v=4');
                const config = getCloudinaryUploadConfig();
                console.log('=== CLOUDINARY DEBUG ===');
                console.log('Config:', config);
                console.log('uploadUrl:', config?.uploadUrl);
                console.log('uploadPreset:', config?.uploadPreset);
                console.log('folder:', config?.folder);
                console.log('cloudName:', config?.cloudName);
                alert(`Cloudinary Config:\n- Cloud Name: ${config?.cloudName || 'MISSING'}\n- Upload Preset: ${config?.uploadPreset || 'MISSING'}\n- Folder: ${config?.folder || 'MISSING'}\n- Upload URL: ${config?.uploadUrl || 'MISSING'}\n\nCheck console for full details.`);
            };
            wrapper.appendChild(debugBtn);
        }

        // Supplier
        const supplierInput = createInput('Venditore / Fornitore', 'text', 'add-supplier', 'Nome fornitore');
        wrapper.appendChild(supplierInput);

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

                if (existingDeleteToken) {
                    try {
                        await deleteImageFromCloudinary(existingDeleteToken);
                    } catch (deleteErr) {
                        console.warn('[ADD_ESSENCE] Failed to delete previous image via Cloudinary token', deleteErr);
                    }
                } else if (existingPublicId) {
                    console.warn('[ADD_ESSENCE] Existing image has Cloudinary public_id but no delete token; backend deletion may be required for cleanup', { existingPublicId });
                }

                try {
                    const { imageRef, cloudinaryPublicId } = await uploadImageToCloudinary(selectedImageFile, dbCategory, name);
                    existingImageRef = imageRef;
                    existingTechData = existingTechData || {};
                    if (cloudinaryPublicId) {
                        existingTechData.cloudinary_public_id = cloudinaryPublicId;
                    }
                } catch (uploadError) {
                    console.error('[ADD_ESSENCE] uploadImageToCloudinary failed', uploadError);
                    alert(`Upload immagine fallito: ${uploadError?.message || uploadError}`);
                    return;
                }
            }
            
            // Update record with new image info (or keep existing if no new image chosen).
            if (existingImageRef) {
                record.image_ref = existingImageRef;
            }
            if (existingTechData) {
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
                if (isEdit && editId) window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory-detail:' + editId }));
                else window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
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
