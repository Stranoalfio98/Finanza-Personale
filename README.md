# Finanza Personale

App di tracciamento finanza personale — stessa base tecnica del Trading Journal
(React + Vite + Supabase, deploy su Netlify).

## Setup

1. `npm install`
2. Copia `.env.example` in `.env` e compila con URL e anon key del tuo progetto
   Supabase (Project Settings → API).
3. Esegui `schema.sql` (ricevuto separatamente) nell'SQL Editor del progetto
   Supabase, prima di avviare l'app.
4. `npm run dev` per l'ambiente locale.

## Test

`npm run test` — esegue i test Vitest su `src/calc.js`, dove vive tutta la
logica di calcolo (saldo conti, patrimonio netto, budget, obiettivi, BFP).
Nessun calcolo importante deve stare nei componenti React: se aggiungi una
formula, aggiungila a `calc.js` con relativo test.

## Struttura

- `src/calc.js` — logica di calcolo pura, testata
- `src/supabaseClient.js` — client Supabase
- `src/pages/` — Dashboard, Inserimento Dati, Investimenti, Patrimonio
- `src/App.jsx` — routing e nav

## Stato attuale

Scaffold iniziale: routing e pagine con dati finti, calc.js già testato
(16 test). Il design vero (palette, tipografia, layout) arriva nel prossimo
giro, con anteprima prima di ogni cambio visivo importante — stesso workflow
del Trading Journal.

## Deploy

Un solo sito Netlify collegato a questo repository — non crearne di doppi
per errore.
