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
// note      = nota olfattiva: 'head' (testa), 'heart' (cuore), 'base' (fondo).
//   Un olio essenziale è una miscela di molte molecole con volatilità diverse:
//   la nota è l'impressione dominante secondo le tabelle di profumeria, e dove
//   le fonti non concordano si è scelta quella più citata.
// density   = densità relativa (g/ml) dalla letteratura, SOLO per gli oli
//   essenziali, che si vendono puri. Fonti: norme ISO (a 20 °C) o schede di
//   The Good Scents Company (TGSC, di solito a 25 °C; la differenza è di
//   qualche millesimo). Assolute, resinoidi e fragranze non la hanno: si
//   vendono spesso diluite e la densità dipende dal solvente, quindi l'app usa
//   il valore predefinito, correggibile a mano sulla singola essenza.
export const SCENT_PRESETS = [
    // Agrumati (agrumato)
    { name: 'Bergamotto',        family_id: 'agrumato',      note: 'head', density: 0.87 }, // ISO 3520 (spremuto)
    { name: 'Limone',            family_id: 'agrumato',      note: 'head', density: 0.85 }, // ISO 855 (spremuto)
    { name: 'Arancia dolce',     family_id: 'agrumato',      note: 'head', density: 0.85 }, // ISO 3140
    { name: 'Arancia Amara',     family_id: 'agrumato',      note: 'head', density: 0.85 }, // ISO 9844 (spremuto)
    { name: 'Mandarino',         family_id: 'agrumato',      note: 'head', density: 0.85 }, // ISO 3528
    { name: 'Pompelmo',          family_id: 'agrumato',      note: 'head', density: 0.86 }, // ISO 3053 (spremuto)
    { name: 'Lemongrass',        family_id: 'agrumato',      note: 'head', density: 0.89 }, // ISO 4718 (C. flexuosus); C. citratus 0,88 (ISO 3217)
    { name: 'Petitgrain',        family_id: 'agrumato',      note: 'head', density: 0.89 }, // ISO 8901 (bigarade)
    { name: 'Lime',              family_id: 'agrumato',      note: 'head', density: 0.86 }, // ISO 3519 (distillato); spremuto 0,88 (ISO 3809)
    { name: 'Yuzu',              family_id: 'agrumato',      note: 'head', density: 0.85 }, // scheda di sicurezza fornitore (spremuto)
    { name: 'Citronella',        family_id: 'agrumato',      note: 'head', density: 0.89 }, // valore del fornitore (letteratura 0,85-0,92)
    { name: 'Litsea cubeba',     family_id: 'agrumato',      note: 'head', density: 0.89 }, // ISO 3214
    { name: 'Combava',           family_id: 'agrumato',      note: 'head', density: 0.85 }, // TGSC (buccia)
    { name: 'Clementina',        family_id: 'agrumato',      note: 'head' }, // spremuto; densità non trovata in letteratura
    { name: 'Mandarino verde',   family_id: 'agrumato',      note: 'head', density: 0.85 }, // ISO 3528 (varietà verde 0,847-0,855)

    // Erbe aromatiche (aromatico)
    { name: 'Menta piperita',    family_id: 'aromatico',     note: 'head' },
    { name: 'Eucalipto',         family_id: 'aromatico',     note: 'head' },
    { name: 'Basilico',          family_id: 'aromatico',     note: 'head' },
    { name: 'Rosmarino',         family_id: 'aromatico',     note: 'head' },
    { name: 'Salvia',            family_id: 'aromatico',     note: 'heart' },
    { name: 'Lavanda',           family_id: 'aromatico',     note: 'heart' },
    { name: 'Ginepro',           family_id: 'aromatico',     note: 'head' },
    { name: 'Timo',              family_id: 'aromatico',     note: 'head' },

    // Floreali (fiorito)
    { name: 'Rosa',              family_id: 'fiorito',       note: 'heart' },
    { name: 'Gelsomino',         family_id: 'fiorito',       note: 'heart' },
    { name: 'Geranio',           family_id: 'fiorito',       note: 'heart', density: 0.89 }, // ISO 4731
    { name: 'Ylang Ylang',       family_id: 'fiorito',       note: 'heart', density: 0.93 }, // completo, CoA NHR 0,904-0,955
    { name: 'Neroli',            family_id: 'fiorito',       note: 'heart', density: 0.86 }, // TGSC
    { name: 'Camomilla',         family_id: 'fiorito',       note: 'heart' },
    { name: 'Fiori di tiglio',   family_id: 'fiorito',       note: 'heart' },
    { name: 'Mughetto',          family_id: 'fiorito',       note: 'heart' },
    { name: 'Peonia',            family_id: 'fiorito',       note: 'heart' },
    { name: 'Magnolia',          family_id: 'fiorito',       note: 'heart' },
    { name: 'Lillà',             family_id: 'fiorito',       note: 'heart' }, // Classico primaverile candele
    { name: 'Fresia',            family_id: 'fiorito',       note: 'heart' },
    { name: 'Orchidea',          family_id: 'fiorito',       note: 'heart' },
    { name: 'Camomilla romana',  family_id: 'fiorito',       note: 'heart', density: 0.90 }, // CIR / scheda tecnica
    { name: 'Camomilla blu',     family_id: 'fiorito',       note: 'heart', density: 0.93 }, // TGSC (matricaria)
    { name: 'Cananga',           family_id: 'fiorito',       note: 'heart', density: 0.91 }, // TGSC
    { name: 'Palmarosa',         family_id: 'fiorito',       note: 'heart', density: 0.89 },
    { name: 'Elicriso',          family_id: 'fiorito',       note: 'heart', density: 0.91 }, // TGSC (a 15 °C)
    { name: 'Davana',            family_id: 'fiorito',       note: 'heart', density: 0.96 }, // TGSC
    { name: 'Osmanto',           family_id: 'fiorito',       note: 'heart' }, // assoluta
    { name: 'Mimosa',            family_id: 'fiorito',       note: 'heart' }, // assoluta
    { name: 'Narciso',           family_id: 'fiorito',       note: 'heart' }, // assoluta
    { name: 'Fior di loto',      family_id: 'fiorito',       note: 'heart' }, // assoluta

    // Fruttati (fruttato)
    { name: 'Mela',              family_id: 'fruttato',      note: 'heart' },
    { name: 'Pesca',             family_id: 'fruttato',      note: 'heart' },
    { name: 'Frutti di bosco',   family_id: 'fruttato',      note: 'heart' },
    { name: 'Fico',              family_id: 'fruttato',      note: 'heart' },
    { name: 'Ribes nero',        family_id: 'fruttato',      note: 'head' },
    { name: 'Pera',              family_id: 'fruttato',      note: 'head' },
    { name: 'Melograno',         family_id: 'fruttato',      note: 'heart' },
    { name: 'Amarena',           family_id: 'fruttato',      note: 'head' },  // Stile "Black Cherry"
    { name: 'Prugna',            family_id: 'fruttato',      note: 'heart' },
    { name: 'Mango',             family_id: 'fruttato',      note: 'head' },
    { name: 'Ananas',            family_id: 'fruttato',      note: 'head' },
    { name: 'Olio di cognac',    family_id: 'fruttato',      note: 'head', density: 0.87 }, // TGSC (cognac verde, dalle fecce del vino)

    // Marina / acquatica (acquatico)
    { name: 'Brezza marina',     family_id: 'acquatico',     note: 'head' },
    { name: 'Sale marino',       family_id: 'acquatico',     note: 'head' },
    { name: 'Alga',              family_id: 'acquatico',     note: 'head' }, // assoluta di Fucus vesiculosus
    { name: 'Finocchio marino',  family_id: 'acquatico',     note: 'head', density: 0.88 }, // scheda fornitore
    
    // Verde (verde)
    { name: 'Tè verde',          family_id: 'verde',         note: 'head' },
    { name: 'Foglia di violetta',family_id: 'verde',         note: 'head' },
    { name: 'Erba tagliata',     family_id: 'verde',         note: 'head' },
    { name: 'Galbano',           family_id: 'verde',         note: 'head', density: 0.89 }, // TGSC
    { name: 'Foglia di pomodoro',family_id: 'verde',         note: 'head' }, // assoluta
    { name: 'Tagete',            family_id: 'verde',         note: 'head', density: 0.87 }, // TGSC; solo Tagetes minuta (T. erecta vietata da IFRA)
    { name: 'Tè nero',           family_id: 'verde',         note: 'base' }, // assoluta
    { name: 'Mate',              family_id: 'verde',         note: 'base' }, // assoluta

    // Spezie calde (warm_spices)
    { name: 'Cannella',          family_id: 'warm_spices',   note: 'heart', density: 1.02 }, // TGSC (corteccia, 1,01-1,03)
    { name: 'Chiodi di garofano',family_id: 'warm_spices',   note: 'heart', density: 1.05 }, // Food Chemicals Codex 1,036-1,060 (gemme); più densa dell'acqua
    { name: 'Zenzero',           family_id: 'warm_spices',   note: 'heart' },
    { name: 'Noce moscata',      family_id: 'warm_spices',   note: 'heart' },
    { name: 'Cardamomo',         family_id: 'warm_spices',   note: 'heart' },
    { name: 'Pepe nero',         family_id: 'warm_spices',   note: 'heart' },
    { name: 'Anice stellato',    family_id: 'warm_spices',   note: 'head' },
    { name: 'Zafferano',         family_id: 'warm_spices',   note: 'heart' },

    // Legnosi (legni)
    { name: 'Sandalo',           family_id: 'legni',         note: 'base', density: 0.98 }, // ISO 3518 (S. album)
    { name: 'Cedro',             family_id: 'legni',         note: 'base' },
    { name: 'Patchouli',         family_id: 'legni',         note: 'base', density: 0.96 }, // ISO 3757
    { name: 'Vetiver',           family_id: 'legni',         note: 'base', density: 1.00 }, // ISO 4716, molto viscoso
    { name: 'Palo Santo',        family_id: 'legni',         note: 'base', density: 0.87 }, // specifiche fornitori
    { name: 'Legno di Guaiaco',  family_id: 'legni',         note: 'base', density: 0.97 }, // TGSC; semisolido, va intiepidito
    { name: 'Cedro della Virginia', family_id: 'legni',      note: 'base', density: 0.96 }, // ISO 4724
    { name: 'Cedro del Texas',   family_id: 'legni',         note: 'base', density: 0.96 }, // ISO 4725
    { name: 'Sandalo australiano', family_id: 'legni',       note: 'base', density: 0.96 }, // ISO 22769 (S. spicatum)
    { name: 'Amyris',            family_id: 'legni',         note: 'base', density: 0.96 }, // TGSC
    { name: 'Copaiba',           family_id: 'legni',         note: 'base', density: 0.95 }, // TGSC

    // Legni secchi (legni_secchi)
    { name: 'Cedro atlantico',   family_id: 'legni_secchi',  note: 'base', density: 0.93 }, // TGSC
    { name: 'Cipresso',          family_id: 'legni_secchi',  note: 'base', density: 0.88 }, // TGSC
    { name: 'Pino',              family_id: 'legni_secchi',  note: 'head' },
    { name: 'Abete balsamico',   family_id: 'legni_secchi',  note: 'heart', density: 0.87 },
    { name: 'Pino silvestre',    family_id: 'legni_secchi',  note: 'head', density: 0.87 }, // TGSC
    { name: 'Abete siberiano',   family_id: 'legni_secchi',  note: 'heart', density: 0.91 }, // TGSC; nota: tabella LG Botanicals
    { name: 'Abete bianco',      family_id: 'legni_secchi',  note: 'head', density: 0.87 }, // TGSC (a 15 °C)
    { name: 'Abete nero',        family_id: 'legni_secchi',  note: 'head', density: 0.91 }, // CoA Liberty Natural
    { name: 'Cedro dell\'Himalaya', family_id: 'legni_secchi', note: 'base', density: 0.98 }, // TGSC
    { name: 'Hinoki',            family_id: 'legni_secchi',  note: 'heart', density: 0.94 }, // TGSC (stimata) // Stile "Balsam & Cedar"

    // Legni muschiati (mossy_woods)
    { name: 'Muschio di quercia',family_id: 'mossy_woods',   note: 'base' },
    { name: 'Muschio bianco',    family_id: 'mossy_woods',   note: 'base' },
    { name: 'Muschio d\'albero',  family_id: 'mossy_woods',   note: 'base' }, // assoluta; IFRA: solo qualità a basso atranolo

    // Gourmand (gourmand)
    { name: 'Vaniglia',          family_id: 'gourmand',      note: 'base' },
    { name: 'Fava tonka',        family_id: 'gourmand',      note: 'base' },
    { name: 'Caramello',         family_id: 'gourmand',      note: 'base' },
    { name: 'Cacao',             family_id: 'gourmand',      note: 'base' },
    { name: 'Caffè',             family_id: 'gourmand',      note: 'base' },
    { name: 'Mandorla',          family_id: 'gourmand',      note: 'heart' },
    { name: 'Miele',             family_id: 'gourmand',      note: 'base' },
    { name: 'Cocco',             family_id: 'gourmand',      note: 'heart' },
    { name: 'Zucca',             family_id: 'gourmand',      note: 'heart' }, // Base per "Pumpkin Spice"
    { name: 'Zucchero di canna', family_id: 'gourmand',      note: 'base' },
    { name: 'Marshmallow',       family_id: 'gourmand',      note: 'base' },
    { name: 'Biscotto',          family_id: 'gourmand',      note: 'base' },
    { name: 'Mandorla amara',    family_id: 'gourmand',      note: 'head', density: 1.05 }, // TGSC; solo FFPA (senza acido prussico)
    { name: 'Fieno',             family_id: 'gourmand',      note: 'base' }, // assoluta, contiene cumarina
    { name: 'Cera d\'api',        family_id: 'gourmand',      note: 'base' }, // assoluta

    // Orientali / ambrati (orientale, orientale_morbido)
    { name: 'Ambra',             family_id: 'orientale',     note: 'base' },
    { name: 'Incenso',           family_id: 'orientale',     note: 'base', density: 0.87 }, // TGSC (olibano)
    { name: 'Benzoino',          family_id: 'orientale_morbido', note: 'base' },
    { name: 'Balsamo del Tolù',  family_id: 'orientale_morbido', note: 'base' }, // resinoide
    { name: 'Balsamo del Perù',  family_id: 'orientale_morbido', note: 'base', density: 1.10 }, // TGSC (olio); il balsamo grezzo è vietato da IFRA
    { name: 'Ambretta',          family_id: 'orientale_morbido', note: 'base', density: 0.91 }, // TGSC (semi)
    { name: 'Mirra',             family_id: 'orientale',     note: 'base', density: 1.00 }, // TGSC
    { name: 'Cisto',             family_id: 'orientale',     note: 'heart', density: 0.88 }, // TGSC
    { name: 'Opoponax',          family_id: 'orientale',     note: 'base', density: 0.90 }, // TGSC; IFRA: limitato
    { name: 'Storace',           family_id: 'orientale',     note: 'base' }, // resinoide; IFRA: ammessi solo estratti
    { name: 'Elemi',             family_id: 'orientale',     note: 'head', density: 0.89 }, // TGSC

    // Orientale legnoso (orientale_legnoso)
    { name: 'Legno di rosa',     family_id: 'orientale_legnoso', note: 'heart', density: 0.88 }, // TGSC; specie CITES, alternativa: Legno di Ho
    { name: 'Oud',               family_id: 'orientale_legnoso', note: 'base', density: 0.96 }, // TGSC; specie CITES
    { name: 'Cuoio',             family_id: 'legni',         note: 'base' },
    { name: 'Tabacco',           family_id: 'orientale_legnoso', note: 'base' },
    { name: 'Legno di Cashmere', family_id: 'legni',         note: 'base' },
    { name: 'Legno di Ho',       family_id: 'orientale_legnoso', note: 'heart', density: 0.86 }, // specifica NHR
    { name: 'Cipriolo',          family_id: 'orientale_legnoso', note: 'base', density: 1.00 }, // TGSC (nagarmotha)

    // Floreale orientale (floral_oriental)
    { name: 'Tuberosa',          family_id: 'floral_oriental', note: 'heart' },
    { name: 'Gelsomino Sambac',  family_id: 'floral_oriental', note: 'heart' },
    { name: 'Champaca',          family_id: 'floral_oriental', note: 'heart' }, // assoluta
    { name: 'Frangipani',        family_id: 'floral_oriental', note: 'heart' }, // assoluta

    // Cipriata / floreale leggera (soft_floral)
    { name: 'Rosa damascena',    family_id: 'soft_floral',   note: 'heart', density: 0.86 }, // TGSC (essenza «otto»; sotto ~20 °C si rapprende)
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
