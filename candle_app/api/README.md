# API serverless (Vercel)

Queste funzioni girano come Serverless Functions di Vercel. La root del progetto su Vercel deve essere `candle_app/`.

## `cloudinary-delete.js`
Elimina un'immagine da Cloudinary a partire dal suo `public_id`. Richiede una **firma server-side**, quindi servono le credenziali segrete di Cloudinary come Environment Variables su Vercel (Project → Settings → Environment Variables):

- `CLOUDINARY_CLOUD_NAME` — es. `dtkrxt96q`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER` — es. `candle_app_images` (la cartella usata negli upload)

> Nota: gli upload dal client sono *unsigned* (preset `candle_app`) e Cloudinary NON restituisce un delete_token, quindi la cancellazione passa obbligatoriamente da questo endpoint firmato.

## `cron/keep-alive.js`
Ping periodico a Supabase per evitare la sospensione del progetto (schedulato in `vercel.json`). Richiede:

- `SUPABASE_URL` (o `VITE_SUPABASE_URL`)
- `SUPABASE_ANON_KEY` (o `VITE_SUPABASE_ANON_KEY`)
