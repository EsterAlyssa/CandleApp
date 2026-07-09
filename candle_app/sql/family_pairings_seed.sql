-- ===================================================
-- Seed abbinamenti mancanti in family_pairings
-- Copre le famiglie che non avevano NESSUN abbinamento:
-- warm_spices, gourmand, floral_oriental, mossy_woods, soft_floral.
-- La guardia NOT EXISTS evita duplicati: rieseguibile senza rischi.
--
-- Da eseguire nel SQL Editor di Supabase (tutto insieme).
-- ===================================================

create extension if not exists "pgcrypto";

insert into public.family_pairings (id, source_family_id, target_family_id, type)
select gen_random_uuid(), v.src, v.tgt, v.t
from (values
    -- Spezia calda (warm_spices)
    ('warm_spices', 'orientale', 'harmony'),
    ('warm_spices', 'gourmand',  'harmony'),
    ('warm_spices', 'legni',     'harmony'),
    ('warm_spices', 'agrumato',  'contrast'),
    ('warm_spices', 'fiorito',   'contrast'),
    ('warm_spices', 'aromatico', 'contrast'),

    -- Gourmand
    ('gourmand', 'warm_spices', 'harmony'),
    ('gourmand', 'orientale',   'harmony'),
    ('gourmand', 'fruttato',    'harmony'),
    ('gourmand', 'agrumato',    'contrast'),
    ('gourmand', 'aromatico',   'contrast'),

    -- Floreale orientale (floral_oriental)
    ('floral_oriental', 'fiorito',           'harmony'),
    ('floral_oriental', 'orientale_morbido',  'harmony'),
    ('floral_oriental', 'soft_floral',        'harmony'),
    ('floral_oriental', 'verde',              'contrast'),
    ('floral_oriental', 'agrumato',           'contrast'),

    -- Legni muschiati (mossy_woods)
    ('mossy_woods', 'legni',        'harmony'),
    ('mossy_woods', 'legni_secchi', 'harmony'),
    ('mossy_woods', 'verde',        'harmony'),
    ('mossy_woods', 'fruttato',     'contrast'),
    ('mossy_woods', 'fiorito',      'contrast'),

    -- Cipriata - floreale leggera (soft_floral)
    ('soft_floral', 'fiorito',           'harmony'),
    ('soft_floral', 'orientale_morbido', 'harmony'),
    ('soft_floral', 'legni',             'harmony'),
    ('soft_floral', 'warm_spices',       'contrast'),
    ('soft_floral', 'legni_secchi',      'contrast'),
    ('soft_floral', 'aromatico',         'contrast')
) as v(src, tgt, t)
where not exists (
    select 1 from public.family_pairings fp
    where fp.source_family_id = v.src and fp.target_family_id = v.tgt
);
