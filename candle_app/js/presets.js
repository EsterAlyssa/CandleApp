// ===================================================
// PRESETS.JS - Catalogo di valori preimpostati (offline)
// Nessun database esterno: sono dati statici inclusi nell'app.
// Servono a precompilare i campi quando si aggiunge un elemento
// al magazzino, così l'utente non deve conoscere i valori tecnici.
//
// I valori sono INDICATIVI e sempre modificabili a mano.
// ===================================================

// --- CERE ---
// conversion_factor = densità della cera rispetto all'acqua
//   (cera_g = capacità_stampo_g_acqua × conversion_factor)
// melt_temp = temperatura di fusione (°C)
// pour_temp = temperatura di versata (°C)
// max_fragrance = carico massimo di fragranza consigliato (%)
export const WAX_PRESETS = [
    { name: 'Cera di soia',          tech_data: { wax_type: 'Soia',            conversion_factor: 0.90, melt_temp: 52, pour_temp: 62, max_fragrance: 10 } },
    { name: 'Cera di soia-cocco',    tech_data: { wax_type: 'Soia-Cocco',      conversion_factor: 0.90, melt_temp: 48, pour_temp: 60, max_fragrance: 11 } },
    { name: 'Cera di cocco',         tech_data: { wax_type: 'Cocco',           conversion_factor: 0.91, melt_temp: 43, pour_temp: 57, max_fragrance: 12 } },
    { name: 'Cera di colza',         tech_data: { wax_type: 'Colza',           conversion_factor: 0.91, melt_temp: 47, pour_temp: 55, max_fragrance: 10 } },
    { name: "Cera d'api",            tech_data: { wax_type: "Api",             conversion_factor: 0.96, melt_temp: 63, pour_temp: 72, max_fragrance: 8 } },
    { name: 'Paraffina',             tech_data: { wax_type: 'Paraffina',       conversion_factor: 0.90, melt_temp: 56, pour_temp: 70, max_fragrance: 10 } },
    { name: 'Cera di palma',         tech_data: { wax_type: 'Palma',           conversion_factor: 0.90, melt_temp: 60, pour_temp: 72, max_fragrance: 9 } },
    { name: 'Cera gel',              tech_data: { wax_type: 'Gel',             conversion_factor: 0.85, melt_temp: 90, pour_temp: 95, max_fragrance: 5 } }
];

// --- ESSENZE ---
// family_id = id della famiglia olfattiva (combacia con la tabella `families`
//   dell'utente: agrumato, fiorito, legni, gourmand, warm_spices, ...).
//   Viene usato per selezionare direttamente la famiglia nel form.
// note      = nota olfattiva: 'head' (testa), 'heart' (cuore), 'base' (fondo)
export const SCENT_PRESETS = [
    // Agrumati (agrumato)
    { name: 'Bergamotto',        family_id: 'agrumato',      note: 'head' },
    { name: 'Limone',            family_id: 'agrumato',      note: 'head' },
    { name: 'Arancia dolce',     family_id: 'agrumato',      note: 'head' },
    { name: 'Mandarino',         family_id: 'agrumato',      note: 'head' },
    { name: 'Pompelmo',          family_id: 'agrumato',      note: 'head' },
    { name: 'Lemongrass',        family_id: 'agrumato',      note: 'head' },
    { name: 'Petitgrain',        family_id: 'agrumato',      note: 'head' },

    // Erbe aromatiche (aromatico)
    { name: 'Menta piperita',    family_id: 'aromatico',     note: 'head' },
    { name: 'Eucalipto',         family_id: 'aromatico',     note: 'head' },
    { name: 'Basilico',          family_id: 'aromatico',     note: 'head' },
    { name: 'Rosmarino',         family_id: 'aromatico',     note: 'head' },
    { name: 'Salvia',            family_id: 'aromatico',     note: 'heart' },
    { name: 'Lavanda',           family_id: 'aromatico',     note: 'heart' },

    // Floreali (fiorito)
    { name: 'Rosa',              family_id: 'fiorito',       note: 'heart' },
    { name: 'Gelsomino',         family_id: 'fiorito',       note: 'heart' },
    { name: 'Geranio',           family_id: 'fiorito',       note: 'heart' },
    { name: 'Ylang Ylang',       family_id: 'fiorito',       note: 'heart' },
    { name: 'Neroli',            family_id: 'fiorito',       note: 'heart' },
    { name: 'Camomilla',         family_id: 'fiorito',       note: 'heart' },
    { name: 'Fiori di tiglio',   family_id: 'fiorito',       note: 'heart' },

    // Fruttati (fruttato)
    { name: 'Mela',              family_id: 'fruttato',      note: 'heart' },
    { name: 'Pesca',             family_id: 'fruttato',      note: 'heart' },
    { name: 'Frutti di bosco',   family_id: 'fruttato',      note: 'heart' },
    { name: 'Fico',              family_id: 'fruttato',      note: 'heart' },
    { name: 'Ribes nero',        family_id: 'fruttato',      note: 'head' },

    // Marina / acquatica (acquatico)
    { name: 'Brezza marina',     family_id: 'acquatico',     note: 'head' },
    { name: 'Note acquatiche',   family_id: 'acquatico',     note: 'head' },
    { name: 'Sale marino',       family_id: 'acquatico',     note: 'head' },

    // Verde (verde)
    { name: 'Tè verde',          family_id: 'verde',         note: 'head' },
    { name: 'Foglia di violetta',family_id: 'verde',         note: 'head' },
    { name: 'Erba tagliata',     family_id: 'verde',         note: 'head' },

    // Spezie calde (warm_spices)
    { name: 'Cannella',          family_id: 'warm_spices',   note: 'heart' },
    { name: 'Chiodi di garofano',family_id: 'warm_spices',   note: 'heart' },
    { name: 'Zenzero',           family_id: 'warm_spices',   note: 'heart' },
    { name: 'Noce moscata',      family_id: 'warm_spices',   note: 'heart' },
    { name: 'Cardamomo',         family_id: 'warm_spices',   note: 'heart' },

    // Legnosi (legni)
    { name: 'Sandalo',           family_id: 'legni',         note: 'base' },
    { name: 'Cedro',             family_id: 'legni',         note: 'base' },
    { name: 'Patchouli',         family_id: 'legni',         note: 'base' },
    { name: 'Vetiver',           family_id: 'legni',         note: 'base' },

    // Legni secchi (legni_secchi)
    { name: 'Cedro atlantico',   family_id: 'legni_secchi',  note: 'base' },
    { name: 'Cipresso',          family_id: 'legni_secchi',  note: 'base' },

    // Legni muschiati (mossy_woods)
    { name: 'Muschio di quercia',family_id: 'mossy_woods',   note: 'base' },
    { name: 'Muschio bianco',    family_id: 'mossy_woods',   note: 'base' },

    // Gourmand (gourmand)
    { name: 'Vaniglia',          family_id: 'gourmand',      note: 'base' },
    { name: 'Fava tonka',        family_id: 'gourmand',      note: 'base' },
    { name: 'Caramello',         family_id: 'gourmand',      note: 'base' },
    { name: 'Cacao',             family_id: 'gourmand',      note: 'base' },

    // Orientali / ambrati (orientale, orientale_morbido)
    { name: 'Ambra',             family_id: 'orientale',     note: 'base' },
    { name: 'Incenso',           family_id: 'orientale',     note: 'base' },
    { name: 'Benzoino',          family_id: 'orientale_morbido', note: 'base' },
    { name: 'Mirra',             family_id: 'orientale',     note: 'base' },

    // Orientale legnoso (orientale_legnoso)
    { name: 'Legno di rosa',     family_id: 'orientale_legnoso', note: 'heart' },
    { name: 'Oud',               family_id: 'orientale_legnoso', note: 'base' },

    // Floreale orientale (floral_oriental)
    { name: 'Tuberosa',          family_id: 'floral_oriental', note: 'heart' },
    { name: 'Gelsomino Sambac',  family_id: 'floral_oriental', note: 'heart' },

    // Cipriata / floreale leggera (soft_floral)
    { name: 'Rosa damascena',    family_id: 'soft_floral',   note: 'heart' },
    { name: 'Iris',              family_id: 'soft_floral',   note: 'base' },
    { name: 'Labdano',           family_id: 'soft_floral',   note: 'base' }
];

// Normalizza una stringa per confronto case/accent-insensitive.
export function normalizeName(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

export function findWaxPreset(name) {
    const n = normalizeName(name);
    if (!n) return null;
    return WAX_PRESETS.find(p => normalizeName(p.name) === n) || null;
}

export function findScentPreset(name) {
    const n = normalizeName(name);
    if (!n) return null;
    return SCENT_PRESETS.find(p => normalizeName(p.name) === n) || null;
}
