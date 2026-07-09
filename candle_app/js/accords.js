// ===================================================
// ACCORDS.JS - Motore di classificazione olfattiva
// Determina la "famiglia risultante" di una candela a partire
// dalle famiglie delle essenze che la compongono.
//
// Logica (basata sulla profumeria classica / ruota di Michael Edwards):
//   1. Un accordo scatta se il mix CONTIENE tutte le famiglie richieste
//      (può averne anche altre in più).
//   2. Se più accordi combaciano, vince il più SPECIFICO (più famiglie richieste).
//   3. Se nessun accordo combacia, si usa la famiglia DOMINANTE (la più frequente).
//
// Le regole sono modificabili liberamente: basta aggiungere/togliere righe.
// Gli id di famiglia devono combaciare con la tabella `families` del DB.
// ===================================================

// Regole di accordo, dalla più specifica alla meno specifica.
// required = tutte le famiglie che devono essere presenti; result = famiglia risultante.
export const ACCORD_RULES = [
    { required: ['agrumato', 'fiorito', 'orientale', 'mossy_woods'], result: 'floral_oriental', label: 'chypre molto floreale e resinoso' },
    { required: ['agrumato', 'fiorito', 'warm_spices', 'legni'],     result: 'orientale_legnoso', label: 'orientale ricco e legnoso speziato' },
    { required: ['agrumato', 'fiorito', 'mossy_woods'],              result: 'mossy_woods',      label: 'accordo chypre classico' },
    { required: ['fiorito', 'warm_spices', 'orientale'],             result: 'orientale',        label: 'orientale classico speziato e resinoso' },
    { required: ['fiorito', 'orientale', 'legni'],                   result: 'orientale_legnoso', label: 'florientale con fondo legnoso strutturato' },
    { required: ['agrumato', 'aromatico', 'legni'],                  result: 'legni_secchi',     label: 'accordo fougère legnoso e secco' },
    { required: ['fiorito', 'fruttato', 'gourmand'],                 result: 'orientale_morbido', label: 'dolce fruttato/floreale vanigliato' },
    { required: ['agrumato', 'acquatico', 'legni'],                  result: 'legni',            label: 'accordo marino legnoso fresco' },
    { required: ['fiorito', 'mossy_woods'],                          result: 'floral_oriental',  label: 'chypre fortemente sbilanciato sui fiori' },
    { required: ['fiorito', 'warm_spices'],                          result: 'floral_oriental',  label: 'fiori resi caldi dalle spezie' },
    { required: ['fiorito', 'soft_floral'],                          result: 'soft_floral',      label: 'floreale talcato, polveroso o aldeidato' },
    { required: ['warm_spices', 'orientale'],                        result: 'orientale',        label: 'resine e vaniglia riscaldate da spezie' },
    { required: ['orientale', 'legni'],                              result: 'orientale_legnoso', label: "base d'ambra smorzata da legni profondi" },
    { required: ['fiorito', 'orientale_morbido'],                    result: 'orientale_morbido', label: 'fiori delicati su base d\'incenso o muschi' },
    { required: ['legni', 'aromatico'],                              result: 'legni_secchi',     label: 'note boschive asciutte ed erbe aromatiche' },
    { required: ['legni', 'warm_spices'],                            result: 'legni_secchi',     label: 'legni resi asciutti e vibranti dalle spezie' },
    { required: ['fruttato', 'mossy_woods'],                         result: 'mossy_woods',      label: 'chypre moderno fruttato' },
    { required: ['fiorito', 'gourmand'],                             result: 'orientale_morbido', label: 'floreale gourmand dolce' },
    { required: ['verde', 'fiorito'],                                result: 'fiorito',          label: 'floreale verde primaverile' },
    { required: ['agrumato', 'aromatico'],                           result: 'aromatico',        label: 'colonia aromatica classica' }
];

// Famiglia più frequente tra quelle passate (fallback quando nessun accordo combacia).
export function computeDominantFamily(familyIds) {
    const counts = {};
    (familyIds || []).forEach(f => {
        if (f) counts[f] = (counts[f] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
}

// Cerca l'accordo più specifico che è contenuto nel set di famiglie presenti.
export function matchAccord(familyIds) {
    const present = new Set((familyIds || []).filter(Boolean));
    if (present.size === 0) return null;
    // Ordina per specificità (più famiglie richieste = prima), mantenendo l'ordine
    // originale a parità di lunghezza (stable sort).
    const sorted = ACCORD_RULES
        .map((rule, i) => ({ rule, i }))
        .sort((a, b) => (b.rule.required.length - a.rule.required.length) || (a.i - b.i));
    for (const { rule } of sorted) {
        if (rule.required.every(f => present.has(f))) {
            return rule.result;
        }
    }
    return null;
}

// Famiglia risultante finale: accordo se presente, altrimenti dominante.
export function resolveResultingFamily(familyIds) {
    return matchAccord(familyIds) || computeDominantFamily(familyIds);
}
