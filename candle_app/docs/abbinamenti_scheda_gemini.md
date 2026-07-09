# Scheda per Gemini — Abbinamenti famiglie (armonia / contrasto)

Copia e incolla tutto il testo qui sotto in Gemini.

---

Sto costruendo il sistema di abbinamenti di una app per candele profumate.
Ogni essenza appartiene a una famiglia olfattiva. Voglio sapere, per ogni famiglia,
quali ALTRE famiglie ci stanno bene per ARMONIA (assecondare) e per CONTRASTO (creare tensione).

Queste sono le UNICHE famiglie disponibili (usa ESATTAMENTE questi `id`):

| id                | nome                          |
|-------------------|-------------------------------|
| agrumato          | Agrumata                      |
| verde             | Verde                         |
| acquatico         | Marina                        |
| aromatico         | Erbe aromatiche               |
| fiorito           | Floreale                      |
| fruttato          | Fruttata                      |
| warm_spices       | Spezia calda                  |
| legni             | Legnosa                       |
| legni_secchi      | Legni secchi                  |
| mossy_woods       | Legni muschiati               |
| gourmand          | Gourmand                      |
| orientale         | Orientale                     |
| orientale_morbido | Orientale morbido             |
| orientale_legnoso | Orientale legnoso             |
| floral_oriental   | Floreale orientale            |
| soft_floral       | Cipriata - floreale leggera   |

Mi servono gli abbinamenti SOLO per queste 4 famiglie (le altre le ho già):
`gourmand`, `floral_oriental`, `mossy_woods`, `soft_floral`.

## Formato della risposta (rispettalo alla lettera)
Una riga per ogni abbinamento, così:

`famiglia_sorgente -> famiglia_target : harmony`
`famiglia_sorgente -> famiglia_target : contrast`

Regole:
- usa solo gli `id` della tabella;
- `harmony` = si assecondano; `contrast` = opposti che si valorizzano;
- non ripetere la stessa coppia; l'abbinamento è considerato bidirezionale;
- dai 2-4 armonie e 2-3 contrasti per ciascuna delle 4 famiglie.

Esempio del formato:
`gourmand -> warm_spices : harmony`
`gourmand -> agrumato : contrast`

Niente spiegazioni lunghe: voglio solo l'elenco di righe nel formato indicato.
