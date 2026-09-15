# Urban Mining Connect — frontend prototype

This is a no-build HTML/CSS/JavaScript prototype restructured around **Urban Mining / Secondary Raw Materials**.

## Flows
- Material streams: Ferrous, Non-Ferrous, Critical Minerals, E-Waste, Mixed Scrap
- Capture: photo + material + approximate weight + offline local save
- Valuation: indicative price board with language/audio demo
- Authorized buyers: ranked buyer cards with authorization, distance, rate, pickup and reliability
- Traceability: custody proof and append-only event trail UI
- Recovery statistics: recovered tonnage, traceability health and stream breakdown
- Collector ledger: earnings linked to material/buyer
- Recycler/recovery partner console
- Safety guidance

## Run
Open `index.html` directly, or:
`python -m http.server 8000`

## Important
This is a frontend prototype. Rates, facilities, authorization dates and recovery metrics are illustrative seed data. Production requires secure backend APIs, live authorization verification, signed QR payloads, real GPS/identity controls, durable sync/reconciliation, validated market data and appropriate regulatory integrations.
