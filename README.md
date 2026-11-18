# British Reverse Auction — RFQ Management System

GoComet Full Stack Intern Assignment

## 1. Project Overview

In freight procurement, reverse auctions allow logistics shippers to solicit competitive transportation quotations from pre-qualified carriers. Unlike standard reverse auctions with static deadlines, a British reverse auction dynamically extends the auction closing time when qualifying bids are submitted near the deadline. This mechanism mitigates bid sniping, encourages fair price discovery, and provides competing suppliers reasonable opportunity to respond.

This repository implements a full-stack British reverse auction RFQ system. Shippers can define freight tenders with itemized charge breakdowns, schedule milestones, and custom anti-sniping extension rules. Carriers can submit iteratively lower quotations, track live L1 standings, view audit histories, and inspect real-time deadline extensions.

---

## 2. Features

- **RFQ Management**: Create and track freight tenders with pickup dates, bidding windows, and closure deadlines.
- **Supplier Directory**: Register and inspect participating freight carriers and logistics suppliers.
- **Itemized Freight Quotations**: Bids capture distinct line items for freight charges, origin charges, destination charges, and transit time.
- **Dynamic L1 Supplier Leaderboard**: Real-time calculation of Rank 1 (L1 lowest total quote) with deterministic tie-breaking.
- **Strict Decrement Enforcement**: Suppliers must submit bids strictly lower than their own prior quotation total.
- **Configurable Anti-Sniping Engine**: Supports three overtime trigger policies (`ANY_BID`, `ANY_RANK_CHANGE`, `L1_CHANGE`) within a configurable trigger window.
- **Hard Forced-Close Limit**: Prevents indefinite overtime by capping all extensions at an immutable upper bound.
- **Audit Log & Activity Timeline**: Chronological event tracking for RFQ creation, submitted bids, and dynamic deadline extensions.
- **Reliable Live Synchronization**: 5-second background polling with tab visibility detection, request deduplication, and stale data indicators.
- **Responsive Interface**: Compact B2B dashboard built with Tailwind CSS, supporting desktop screen widths up to 1600px without horizontal table overflow.

---

## 3. Screenshots

### Live Auction Workspace — L1 Leaderboard & Supplier Rankings
![Live Auction Workspace](docs/screenshots/live-auction-workspace.png)

### Live Auction Workspace — Active Bidding & Live Countdown
![Live Auction Active Bidding](docs/screenshots/live-auction-active.png)

### Procurement & Auction Dashboard
![Procurement and Auction Dashboard](docs/screenshots/dashboard.png)

### Freight RFQ Management & Filtering
![Freight RFQ Management](docs/screenshots/rfq-management.png)

### Create Freight RFQ — Complete Form
![Create Freight RFQ](docs/screenshots/create-rfq.png)

### RFQ Schedule & Dynamic Extension Rules
![RFQ Schedule and Extension Rules](docs/screenshots/create-rfq-schedule.png)

---

## 4. Tech Stack

### Frontend
- **Framework**: Next.js 16.4.6 (App Router, React Server Components)
- **UI Library**: React 19.3.0, React DOM 19.3.0
- **Language**: JavaScript (ESM, JSX)
- **Styling**: Tailwind CSS 4.3.3, PostCSS
- **Bundler**: Webpack (explicitly configured via Next.js CLI flags)

### Backend
- **Framework**: FastAPI 0.163.2, Starlette 1.10.0
- **Validation**: Pydantic 2.14.3
- **Language/Runtime**: Python >= 3.12 (developed with Python 3.12.15)
- **ASGI Server**: Uvicorn 0.54.0

### Database
- **Engine**: PostgreSQL
- **ORM**: SQLAlchemy 2.1.9 (Declarative 2.0 mapping)
- **Driver**: psycopg 3.3.9 (binary)
- **Migrations**: Alembic 1.20.1

### Testing & Tooling
- **Backend Testing**: pytest 9.2.0, pytest-mock 3.17.0
- **Frontend Quality**: ESLint 9 (Flat Config), eslint-config-next 16.4.6

---

## 5. System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Browser"]
        UI["React 19 Dashboard & Workspace"]
        Clock["1s Local Clock (useSyncExternalStore)"]
        Sync["5s Polling Engine (visibilityState aware)"]
    end

    subgraph NextServer ["Next.js App Router (Port 3000)"]
        SSR["Server Component SSR (/, /rfqs, /rfqs/id)"]
        Proxy["Same-Origin Route Handlers (/api/*)"]
        ApiClient["Shared API Layer (frontend/src/lib/api.js)"]
    end

    subgraph FastApiServer ["FastAPI Service (Port 8000)"]
        Router["API Routers (/api/v1/*)"]
        BidService["Bid Service (Pessimistic Row Lock)"]
        RankService["Ranking Service (On-the-Fly Sort)"]
        ExtService["Extension Service (Anti-Sniping Engine)"]
    end

    subgraph Database ["PostgreSQL Persistence"]
        DB[(Tables: rfqs, suppliers, quotations, bids, logs)]
    end

    UI -->|Page Request| SSR
    UI -->|REST Mutation & Poll| Proxy
    SSR -->|Server Fetch| ApiClient
    Proxy -->|Proxy Forward| ApiClient
    ApiClient -->|HTTP REST /api/v1| Router
    Router --> BidService
    Router --> RankService
    BidService --> ExtService
    BidService -->|SELECT FOR UPDATE / COMMIT| DB
    RankService -->|SELECT / JOIN / ORDER BY| DB
```

Initial page views are server-rendered with pre-fetched data from FastAPI to ensure zero cumulative layout shift. Active workspaces poll same-origin Next.js Route Handlers (`/api/rfqs/[id]/*`), which forward requests to FastAPI endpoints under `/api/v1/*` using standardized response envelopes.

---

## 6. Auction Rules

### Core Rules
1. **Total Evaluation**: Total quotation equals the exact sum of freight, origin, and destination charges (`total = freight + origin + destination`).
2. **L1 Leader**: The supplier with the lowest evaluated total quotation is assigned Rank 1 (L1).
3. **Deterministic Tie-Breaking**: When multiple quotations have identical total amounts:
   - Primary: `total_amount ASC`
   - Secondary: `last_bid_at ASC` (earlier submission timestamp wins)
   - Tertiary: `id ASC` (lower quotation database identifier breaks exact timestamp ties)
4. **Strict Decrement Rule**: A supplier cannot submit a bid equal to or higher than their own existing quote. Each revision must be strictly lower.
5. **Server-Authoritative Clock**: Deadlines are validated on the backend against server UTC time (`datetime.now(timezone.utc)`). Client clocks are used only for local countdown visual rendering.

### Anti-Sniping Extension Policies
If a qualifying bid is submitted within the trigger window (`now >= current_close_at - trigger_window_minutes`), the auction deadline is extended:

- `ANY_BID`: Any valid bid submitted inside the trigger window triggers an extension.
- `ANY_RANK_CHANGE`: Bids that cause any positional movement on the leaderboard trigger an extension.
- `L1_CHANGE`: Only bids that overtake the current Rank 1 leader trigger an extension.

### Extension Formula
$$\text{new\_close\_at} = \min(\text{current\_close\_at} + \text{extension\_minutes}, \text{forced\_close\_at})$$

If the calculated `new_close_at` does not strictly exceed `current_close_at`, no extension is applied.

### Extension Example
- `initial_close_at`: 10:00 UTC
- `current_close_at`: 10:00 UTC
- `forced_close_at`: 10:30 UTC
- `trigger_window_minutes`: 5 minutes (trigger window starts at 09:55 UTC)
- `extension_minutes`: 10 minutes
- A supplier submits a qualifying bid at 09:57 UTC.
- Because 09:57 is within `[09:55, 10:00)`, `current_close_at` extends to $\min(10:00 + 10\text{ min}, 10:30) = 10:10\text{ UTC}$.
- The new trigger window automatically shifts to `[10:05, 10:10)`.

---

## 7. Database Design

The schema separates standing quotations from historical bid records:
- `quotations`: Holds each supplier's single active standing quote per RFQ. Backed by `UNIQUE (rfq_id, supplier_id)`.
- `bids`: Append-only audit ledger recording every accepted bid across all bidding rounds.

```mermaid
erDiagram
    rfqs ||--o{ quotations : "has"
    rfqs ||--o{ auction_activity_logs : "records"
    suppliers ||--o{ quotations : "submits"
    quotations ||--o{ bids : "contains"
    bids |o--o{ auction_activity_logs : "generates"

    rfqs {
        int id PK
        string reference_id UK
        string name
        timestamptz current_close_at
        timestamptz forced_close_at
        string extension_trigger
    }

    suppliers {
        int id PK
        string name
    }

    quotations {
        int id PK
        int rfq_id FK
        int supplier_id FK
        numeric total_amount
        timestamptz last_bid_at
    }

    bids {
        int id PK
        int quotation_id FK
        numeric total_amount
        timestamptz accepted_at
    }

    auction_activity_logs {
        int id PK
        int rfq_id FK
        int bid_id FK
        string event_type
    }
```

Foreign-key constraint notes:
- `quotations.rfq_id` references `rfqs.id`.
- `quotations.supplier_id` references `suppliers.id`.
- `bids.quotation_id` references `quotations.id`. `bids` does not have an `rfq_id` foreign key.
- `auction_activity_logs.rfq_id` references `rfqs.id`.
- `auction_activity_logs.bid_id` references `bids.id` (nullable).

---

## 8. Getting Started

### Prerequisites
- Python 3.12 or higher
- Node.js 20 or higher, with npm
- PostgreSQL 14 or higher running locally on port 5432

### 1. Clone the Repository
```bash
git clone https://github.com/msc231104-lab/gocomet-british-auction.git
cd gocomet-british-auction
```

### 2. Configure the PostgreSQL Database
Connect to PostgreSQL and create the application database and user:
```sql
CREATE USER gocomet_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE gocomet_auction OWNER gocomet_user;
GRANT ALL PRIVILEGES ON DATABASE gocomet_auction TO gocomet_user;
```

### 3. Setup and Run the Backend
```bash
cd backend

# Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your database credentials:
# DATABASE_URL=postgresql+psycopg://gocomet_user:your_secure_password@127.0.0.1:5432/gocomet_auction

# Apply database migrations
alembic upgrade head

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```

FastAPI will be accessible at:
- Service URL: `http://localhost:8000`
- Swagger Documentation: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/health`

### 4. Setup and Run the Frontend
Open a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

The web application will be accessible at:
- Web App URL: `http://localhost:3000`

---

## 9. Environment Variables

### Backend Configuration (`backend/.env`)
| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string used by SQLAlchemy engine | `postgresql+psycopg://gocomet_user:password@127.0.0.1:5432/gocomet_auction` |
| `TEST_DATABASE_URL` | Connection string for dedicated integration test database | `postgresql+psycopg://gocomet_user:password@127.0.0.1:5432/gocomet_auction_test` |

### Frontend Configuration (Optional)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `BACKEND_API_URL` | Base URL of FastAPI server for Next.js server-side fetches | `http://localhost:8000` |
| `NEXT_PUBLIC_BACKEND_URL` | Fallback backend URL for client-side environments | `http://localhost:8000` |

---

## 10. API Endpoints

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Basic application health status check |
| `GET` | `/api/v1/health/db` | Database connectivity verification check (`SELECT 1`) |
| `POST` | `/api/v1/rfqs` | Create a new freight RFQ with British auction rules |
| `GET` | `/api/v1/rfqs` | List all RFQs with dynamically derived auction statuses |
| `GET` | `/api/v1/rfqs/{rfq_id}` | Retrieve details and status for a single RFQ |
| `GET` | `/api/v1/rfqs/{rfq_id}/rankings` | Retrieve current supplier rankings for an RFQ |
| `GET` | `/api/v1/rfqs/{rfq_id}/activity` | Retrieve chronological activity audit feed |
| `POST` | `/api/v1/rfqs/{rfq_id}/bids` | Submit a competitive supplier quotation |
| `GET` | `/api/v1/rfqs/{rfq_id}/bids` | List complete historical bids for an RFQ |
| `POST` | `/api/v1/suppliers` | Register a new carrier or logistics supplier |
| `GET` | `/api/v1/suppliers` | List all registered suppliers |

---

## 11. Running Tests

### Backend Unit Tests
Execute the unit test suite covering bid schema validation, anti-sniping extension formulas, and mock transaction rollbacks:
```bash
PYTHONPATH=backend backend/.venv/bin/pytest backend/tests/test_bid_validation.py backend/tests/test_auction_extension.py backend/tests/test_bid_service.py
```

### Backend Integration Tests (Dedicated Test Database)
Integration tests verify complete database persistence and concurrency under real PostgreSQL transactions.
- **Fail-Closed Safety Guard**: `test_integration_e2e.py` refuses to execute against `DATABASE_URL` to prevent development data corruption.
- To run integration tests, create an isolated database with `test` in its name and set `TEST_DATABASE_URL`:
```bash
createdb gocomet_auction_test
TEST_DATABASE_URL="postgresql+psycopg://gocomet_user:password@127.0.0.1:5432/gocomet_auction_test" PYTHONPATH=backend backend/.venv/bin/pytest backend/tests/test_integration_e2e.py
```

### Frontend Verification
```bash
cd frontend

# Run ESLint validation
npm run lint

# Verify production Webpack build
npm run build
```

---

## 12. Engineering Decisions

- **Pessimistic Row-Level Locking (`SELECT FOR UPDATE`)**: High-frequency concurrent bids for the same RFQ are serialized at the database row level. This prevents race conditions in deadline extension calculations, eliminates duplicate active quotations, and guarantees that strict undercutting rules are evaluated against the latest committed state.
- **Dynamic On-the-Fly Leaderboard**: Ranks are computed on read operations using composite indexes (`total_amount ASC, last_bid_at ASC, id ASC`). This avoids database write amplification and index fragmentation that would result from updating stored rank columns across all suppliers upon every bid.
- **Server-Authoritative Clock**: The backend ignores client-provided timestamps for bid acceptance and auction closure, evaluating all lifecycle events against UTC server time.
- **HTTP REST Polling vs WebSockets**: A 5-second polling architecture was chosen for simplicity, horizontal scalability, and reliability. Polling automatically pauses when browser tabs are hidden, reducing idle server load, while immediate sync triggers upon tab refocus.
- **Modular Monolith Architecture**: Clean separation between FastAPI business services, SQLAlchemy database models, and Next.js proxy route handlers enables maintainable code structure without distributed system overhead.

---

## 13. Limitations

- **Authentication & Authorization**: The application does not implement authentication or role-based access controls. Supplier selection is available from an open directory for testing purposes.
- **Single Currency**: All monetary values are evaluated in USD ($). Currency conversion and localized formatting are not implemented.
- **Single Line-Item Freight**: Each RFQ represents a single origin-destination lane. Multi-leg line items and container splits are not supported.
- **Lazy Auction Closure**: Auction closure is evaluated dynamically upon incoming API requests. There is no standing background task daemon (e.g. Celery or cron) that marks expired auctions as closed independently of user traffic.
- **Local Development Configuration**: The project is structured for evaluation in local development environments. Production containerization, CDN asset distribution, and Kubernetes manifests are not included.

---

## 14. Project Structure

```
gocomet-british-auction/
├── README.md
├── backend/
│   ├── pyproject.toml               # Python project dependencies and test configuration
│   ├── requirements.txt             # Pinned pip dependencies
│   ├── alembic.ini                  # Alembic database migration configuration
│   ├── app/
│   │   ├── main.py                  # FastAPI application factory and routes
│   │   ├── api/                     # Endpoint routers (rfqs.py, bids.py, suppliers.py)
│   │   ├── db/                      # Database session and base declarative models
│   │   ├── models/                  # SQLAlchemy ORM models (RFQ, Supplier, Quotation, Bid)
│   │   ├── schemas/                 # Pydantic request/response validation models
│   │   └── services/                # Core business logic (bidding, rankings, extensions)
│   ├── migrations/                  # Alembic schema version scripts
│   └── tests/                       # Unit and integration test suites
└── frontend/
    ├── package.json                 # Next.js scripts and npm dependencies
    ├── next.config.mjs              # Next.js framework configuration
    ├── postcss.config.mjs           # PostCSS and Tailwind CSS plugin configuration
    └── src/
        ├── app/                     # App Router pages and same-origin API routes
        ├── components/
        │   ├── layout/              # AppShell, Sidebar, Header
        │   ├── rfqs/                # Workspace, Leaderboard, BidForm, Timeline
        │   ├── suppliers/           # Supplier list and creation modal
        │   └── ui/                  # Reusable icons, stat cards, and banners
        └── lib/
            ├── api.js               # Centralized backend HTTP client
            └── formatters.js        # UTC datetime and currency utilities
```
