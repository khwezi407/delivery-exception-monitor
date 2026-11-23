# Delivery Exception Monitor

A premium freight operations control room for the **Durban–Gauteng N3 corridor**.

It notices when a shipment hasn't sent an update it should have, alerts the operations team within minutes, and closes the alert automatically when the late update finally arrives — even if updates arrive twice, out of order, or in a burst after a load-shedding power cut.

> Built by Khwezi Maphumulo · AWS re:Start graduate · Cloud Practitioner

---

## The South African story

The N3 is the busiest freight corridor in Africa — Durban port handles roughly **60% of South African container traffic**, with vehicles and goods moving to City Deep inland terminal and on to Gauteng distribution centres. Depots lose power during load-shedding, handheld scanners store events offline, and when power returns hundreds of updates arrive at once: some duplicated, some out of order, some malformed.

This system is built for exactly that environment.

---

## What makes it more than a tracking dashboard

| Feature | Business value |
|---|---|
| **Exactly-once storage** | A conditional DynamoDB write means the same event arriving twice, ten times, or a hundred times is stored exactly once. Zero duplicates in the database — ever. |
| **Out-of-order resilience** | State is calculated from *when things happened*, not when messages arrived. A DEPARTED event that arrives after ARRIVED_DEPOT still produces the right state. |
| **Two-stage early warning** | AT_RISK fires the moment a milestone is overdue, before the customer feels it. EXCEPTION fires after the grace period — operations and customer service are notified. |
| **Auto-close with time-in-exception** | When the late event finally arrives, the exception closes itself, records how long it was open, and sends a "resolved" notification. |
| **Load-shedding resilience** | The dead-letter queue holds events that couldn't be processed. When power returns, a redrive recovers them — nothing is lost. The dashboard shows the DLQ depth and explains what to do. |
| **SLA performance tracker** | For every milestone across all active shipments, shows how many were on time, the average variance in minutes, and an on-time percentage bar. |
| **CSV export** | One click exports every shipment's state, latest milestone, and next expected update — ready to paste into a client report. |
| **Animated N3 corridor map** | Each shipment is a coloured rectangle placed at its real position on the road. Pulsing means overdue or at risk. Exception callout tags show the shipment ID and minutes late. |

---

## Architecture

Events travel this path:
```
Simulator / scanner → API Gateway → SQS (with DLQ) → Ingest Lambda
                                                      → DynamoDB (shipments, events, exceptions)
                                                      
EventBridge Scheduler (every 5 min) → Sweeper Lambda → SNS → Ops email + CS email
                                                      → DynamoDB (exceptions table)
```

The sweeper notices what *didn't* happen. The ingest function closes exceptions when the late event arrives.

---

## Running locally

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # static site in dist/ — host on S3 or GitHub Pages
npm run preview  # preview the production build
```

**Sample mode** (default): realistic data mirroring the seeded test run. Nothing leaves the browser.

**Live mode**: fill in `public/config.js`:
```js
window.DASH_CONFIG = {
  apiUrl: "https://abc123.execute-api.af-south-1.amazonaws.com",
  cognitoDomain: "https://your-app.auth.af-south-1.amazoncognito.com",
  clientId: "your-cognito-app-client-id",
  redirectUri: location.origin + location.pathname,
};
```

---

## Keyboard shortcuts

- `/` — focus search
- `Ctrl/⌘ K` — command palette
- `Esc` — close palette
- `Enter` on a table row — select shipment

---

## What to say in an interview

> "I used a conditional write for idempotency — the same event arriving ten times is stored exactly once. I recomputed state from event time to handle out-of-order delivery, and a dead-letter queue means one bad message can't block the rest."

> "The sweeper runs every five minutes and raises an AT_RISK alert the moment a milestone is overdue — before the customer feels it. When the late event eventually arrives, the exception closes itself and records how long it was open."

> "I designed it for the Durban corridor specifically, where load-shedding means scanners go offline and then dump a burst of events when power returns. The idempotent ingest handles that case correctly."

---

## Tech stack

React 18 · TypeScript · Vite · Zustand · Framer Motion · lucide-react

**Back end:** API Gateway · SQS · Lambda · DynamoDB · SNS · EventBridge Scheduler · Cognito

---

Reference implementation · MIT · built by Khwezi Maphumulo
