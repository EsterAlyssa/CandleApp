# Scheda per Gemini — Regole di accordo olfattivo

Copia e incolla tutto il testo qui sotto in Gemini.

---

Sto costruendo il motore di classificazione olfattiva di una app per candele profumate.
Ogni essenza appartiene a UNA famiglia olfattiva e ha una posizione nella piramide
(testa/head, cuore/heart, fondo/base). Quando combino più essenze voglio determinare
la **famiglia risultante della candela** (l'accordo).

Queste sono le UNICHE famiglie disponibili nel mio database (usa ESATTAMENTE questi `id`,
non inventarne altri):

| id                | nome                          | nota tipica |
|-------------------|-------------------------------|-------------|
| agrumato          | Agrumata                      | testa       |
| verde             | Verde                         | testa       |
| acquatico         | Marina                        | testa       |
| aromatico         | Erbe aromatiche               | cuore       |
| fiorito           | Floreale                      | cuore       |
| fruttato          | Fruttata                      | cuore       |
| warm_spices       | Spezia calda                  | cuore       |
| legni             | Legnosa                       | fondo       |
| legni_secchi      | Legni secchi                  | fondo       |
| mossy_woods       | Legni muschiati               | fondo       |
| gourmand          | Gourmand                      | fondo       |
| orientale         | Orientale                     | fondo       |
| orientale_morbido | Orientale morbido             | fondo       |
| orientale_legnoso | Orientale legnoso             | fondo       |
| floral_oriental   | Floreale orientale            | cuore       |
| soft_floral       | Cipriata - floreale leggera   | fondo       |

Riferimenti concettuali (ruota di Michael Edwards):
- il **chypre classico** (bergamotto + rosa + muschio di quercia/labdano) va classificato
  come `mossy_woods` (Legni muschiati); se è molto floreale diventa `floral_oriental`.
- `soft_floral` = Soft Floral di Edwards (floreali polverosi/cipriati tipo aldeidati),
  NON è il chypre.
- un accordo si riconosce dalla PRESENZA dei suoi mattoni lungo la piramide, anche con note extra.

## Cosa ti chiedo
Dammi un elenco di REGOLE DI ACCORDO in questo formato preciso, una per riga:

`famiglie_richieste  ->  famiglia_risultante  (note)`

dove:
- `famiglie_richieste` = lista di `id` di famiglia che devono essere TUTTE presenti nel mix
  (indica tra parentesi la nota tipica se rilevante, es. agrumato@head).
- `famiglia_risultante` = uno degli `id` della tabella sopra.
- ordina le regole dalla PIÙ specifica (più famiglie richieste) alla meno specifica.

Esempio del formato che voglio:
`agrumato + fiorito + mossy_woods  ->  mossy_woods  (accordo chypre classico)`
`fiorito + warm_spices  ->  floral_oriental  (fiori resi caldi dalle spezie)`

Coprimi almeno questi accordi/famiglie composte, se ha senso profumiero:
`soft_floral`, `floral_oriental`, `orientale`, `orientale_morbido`, `orientale_legnoso`,
`mossy_woods`, `legni_secchi`. Aggiungine altri se li ritieni corretti.

Non aggiungere spiegazioni lunghe: voglio solo l'elenco di regole nel formato indicato.
