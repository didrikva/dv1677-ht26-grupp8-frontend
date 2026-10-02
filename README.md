# dv1677-ht26-grupp8-frontend

## Gruppmedlemmar

| Namn | GitHub |
|------|--------|
| Didrik Varma | @didrikva |
| Zoe Waters | @zoebalowi |

## Om projektet

Applikationen är frontend delen i resourse booking systemt som byggs i kursen JS_ramverk.
Frontend kommunicerar med backend med hjälp av API-routes.
Repot vi utgår ifrån är: https://grupp5.jsramverk.se

## Kör lokalt

git clone [<repo-url>](https://github.com/didrikva/dv1677-ht26-grupp8-frontend)
cd dv1677-ht26-grupp8-frontend
cp .env.example .env
npm install
npm run dev

**Miljövariabler** (se .env.example):

| Variabel | Beskrivning |
|----------|-------------|
| VITE_API_URL | https://dv1677-laforge.nplab.bth.se |

## Bygga för produktion

npm run build

## Driftsatt

- Frontend: https://didrikva.github.io/dv1677-ht26-grupp8-frontend/
- Backend: https://dv1677-laforge.nplab.bth.se

## Tillvägagångssätt

Dokumentera löpande vad ni gjort och hur ni löst problem.

- Vecka 3: Vi skapade ett frontend repo samt laddade ner en grundtemplate för vue. Vi tänker vidareutveckla frontenden när vi har löst API i backend men grunden är på plats.
- Vecka 4: Vi började att koppla backend api till frontend. Såg till så att frontend kunde hita backend api korrekt och att data existerade. Problemet vi fick vid kopplingen till apiet var lite felaktiga namn på variabler osv vilket ledde till sökningar i filerna för att se till så allt var namngivet korrekt. 
- Vecka 5: Efter föreläsningen denna veckan gjorde vi klart driftsättningen an frontend. Allt fungerade relativt bra till en början. Sen stötte vi på problemet att frontend inte hittade apiet i backend. Först fick vi inget svar alls men efter lite trixande lyckades vi få ett 200 svar och allt borde ha fungerat. Problemet visade sig då vara att databasen innnuti vps var tom vilket resulterade i en tom lista. Vi fick manuellt gå in i vps och fylla databasen med vår seed fil, därefter fungerade allt.