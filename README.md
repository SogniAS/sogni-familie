# SOGNI Familieplanlegger

Hele familiens uke på ett sted. Kalender med faste avtaler og årsoversikt, Spond og andre kalenderlenker, skoleruta for kommunen, felles handleliste, gjøremål for hver person, middagsplan med 48 SOGNI-oppskrifter, egne oppskrifter fra nettsider og varsler når noen endrer noe. Private avtaler er sperret i databasen, så bare eieren kan se dem.

Appen er en nettside som kan legges på hjemskjermen (PWA). Den virker på Android/Samsung og iPhone.

## Slik setter du den opp (én gang)

### 1. Supabase (databasen)
1. Gå til supabase.com og lag et nytt prosjekt. Velg region **Stockholm (eu-north-1)**. Skriv ned database-passordet et trygt sted.
2. Åpne **SQL Editor**, trykk **New query**, lim inn alt fra `supabase/schema.sql` og trykk **Run**.
3. Åpne **Authentication → Sign In / Providers → Email**. Sjekk at **Email** er på.
4. Åpne **Authentication → Emails → Magic Link** og bytt teksten til:
   ```
   <h2>Din kode til SOGNI</h2>
   <p>Skriv inn denne koden i appen: <b>{{ .Token }}</b></p>
   ```
5. Åpne **Project Settings → API**. Kopier **Project URL** og **anon public**-nøkkelen, og lim dem inn i `public/config.js`.

### 2. Netlify (legger appen ut på nett)
1. Gå til netlify.com, velg **Add new site → Import an existing project → GitHub** og velg `sogni-familie`.
2. La **Build command** stå tom. **Publish directory** er `public`. Trykk **Deploy**.
3. Under **Domain management** legger du til `app.sogni.no`. Netlify viser én DNS-linje (CNAME) som legges inn hos den som har domenet.
4. Gå tilbake til Supabase: **Authentication → URL Configuration** og sett **Site URL** til `https://app.sogni.no`.

5. Under **Site configuration → Environment variables** legger du inn to verdier, så Spond og andre kalendere oppdateres automatisk hver 3. time:
   - `SUPABASE_URL`: samme Project URL som i `config.js`
   - `SUPABASE_SERVICE_ROLE_KEY`: fra Supabase **Project Settings → API**, nøkkelen **service_role**. Denne er hemmelig og skal bare ligge i Netlify, aldri i koden.

### 3. Prøv
Åpne app.sogni.no på mobilen, skriv e-posten din og koden du får. Lag familien, og send invitasjonslenken under «Familien» til de andre. Legg appen på hjemskjermen: Android/Samsung: menyen ⋮ → «Legg til på startskjermen». iPhone: Del-knappen → «Legg til på Hjem-skjerm».

## Mapper
- `public/` – selve appen (HTML, CSS, JavaScript, ikoner, `sw.js` for bruk uten nett)
- `public/config.js` – adressen og den offentlige nøkkelen til Supabase
- `supabase/schema.sql` – tabeller, sperrer (Row Level Security) og sanntid
- `public/ics.js` – leser kalenderlenker (iCal) og finner hva som er nytt, endret eller borte
- `public/skolerute.js` – ferier og fridager per kommune. Oppdateres hvert år (juni) når kommunene har vedtatt ny skolerute
- `netlify/functions/recipe.mjs` – henter oppskrifter fra matsider (`/api/recipe?url=…`)
- `netlify/functions/ical.mjs` – henter en kalenderlenke for appen (`/api/ical?url=…`)
- `netlify/functions/feeds-sync.mjs` – oppdaterer alle kalenderlenker hver 3. time

## Spond og skoleruta
- **Spond:** Spond legger aktivitetene inn i kalenderen på telefonen. Den kalenderen (Google eller iCloud) har en privat lenke. Lenken limes inn under «Familien → Spond og andre kalendere». Appen forklarer stegene.
- **Skoleruta:** Velg kommune under «Familien». Ferier vises i uka og årsoversikten. Familien kan legge til egne fridager. Ligger inne for 2026–27: Alver, Austrheim, Bergen, Voss, Oslo, Asker, Bærum, Nordre Follo, Sandnes og Haugesund.

## Neste steg
- Varsler på låst telefon (web push)
- Privat kalenderlenke for Google-, Samsung- og iPhone-kalenderen
- Betaling med Stripe: 49 kr/mnd for 2 personer, +10 kr per ekstra person, 30 dager gratis, årspris
- Personvernerklæring, vilkår og «Slett kontoen min»
