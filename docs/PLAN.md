# WarEra Build Planner – analizė ir planas

## API (api2.warera.io, tRPC)
- Bazė: `https://api2.warera.io/trpc/<ns.proc>?input=<url-encoded JSON>`; auth: `X-API-Key` (dauguma read endpoint'ų veikia ir be jo).
- Naudojami: `search.searchAnything{searchText}` → `userIds`; `user.getUserLite{userId}` (lygis, taškai, `skills.*{level,total,...}`, reitingai, datos, infos);
  `inventory.fetchCurrentEquipment{userId}` (ginklas/šarvai/ammo su state ir skills); `gameConfig.getGameConfig` (skill lygių `cost/totalCost/unlockAtLevel/value`, reset kaina, item'ai);
  vėliau: `itemTrading.getPrices` (kainos), `mu.getById`, `country.getCountryById`.
- Schema paimta iš viešo `WarEraProjects/TRPC` (Responses.d.ts). **Gyvo API šiame konteineryje išbandyti nepavyko** (egress blokuoja api2.warera.io) – parseriai rašyti defensyviai, reikia patikrinti realiu atsakymu.
- Raktas laikomas tik serveryje (`server/handler.mjs`, `.env`), naršyklė kviečia `/api/*`. Serveris kešuoja (config 1 val., kainos 1 min.).

## Modelis
Biudžetas = `totalSkillPoints`; kiekvieno skill'o lygiai 0..10, kaina `totalCost`, atrakinimas `unlockAtLevel ≤ žaidėjo lygis`.
Fiksuoti priedai (įranga/ginklas/buffai) = `skills.k.total − config.value(level)`.
Tikslo funkcija – profilis (Damage / Tank / Economy): Σ w·ln(1+metrika). Damage: `attack·precision%·(1+crit%·critDmg%)`.
**Svoriai ir formulės – euristika**, ne oficialūs žaidimo skaičiai; reikia sukalibruoti pagal tikras žaidimo formules.
Algoritmas: godus (gain/cost, 3 lygių lookahead) + keitimų lokali paieška; rodo reset kainą (`resetSkillsCostPerPoint`).

## Etapai
1. ✅ Karkasas, proxy, profilio kortelės, skill optimizatorius (+testai).
2. Gyvo API patikra, tipų/laukų korekcija, ikonos pagal žaidimo stilių.
3. Įrangos rekomendacijos pagal `itemTrading.getPrices` (kaina/naudingumas), ammo.
4. Pasirenkami svoriai (slideriai), build palyginimas, dalinimasis nuoroda, PWA.
