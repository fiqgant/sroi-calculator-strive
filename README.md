# SROI Calculator – Strive: Sustainable Tourism Initiative

An interactive web application to calculate and project **Social Return on Investment (SROI)** following the SROI Network standard methodology.

Developed for:
**Strive – Sustainable Tourism Initiative**

---

## Features

- Custom stakeholder & outcome inputs (up to 20 stakeholders)
- Standard SROI methodology:
  - 4 impact adjustments: Deadweight, Attribution, Displacement, Drop-off
  - Drop-off applied from Year 2 onward (not Year 1)
  - NPV calculation with configurable discount rate
  - Duration per stakeholder
- 3-year projection with 3 growth models: Linear, Exponential, Logistic
- Live updating SROI with color-coded interpretation
- Interactive charts with area gradients and custom tooltips
- Secure server-side authentication via `.env.local`

---

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Recharts**

---

## Repository Structure

```
sroi-calculator-strive/
│
├── src/
│   ├── app/
│   │   ├── page.tsx              # Root redirect
│   │   ├── login/page.tsx        # Login page
│   │   ├── calculator/page.tsx   # Main SROI calculator
│   │   └── api/auth/route.ts     # Server-side auth endpoint
│   ├── components/
│   │   └── ProjectionChart.tsx   # Recharts area chart
│   └── lib/
│       └── sroi.ts               # SROI calculation logic
├── .env.local                    # Credentials (not committed)
└── ...
```

---

## Installation & Running

### 1. Clone this repository

```bash
git clone https://github.com/fiqgant/sroi-calculator-strive.git
cd sroi-calculator-strive
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env.local`

```env
SROI_USERNAME=admin_strive
SROI_PASSWORD=your_password
SROI_NAME=Admin Strive
```

> Note: wrap values containing special characters (e.g. `#`) in double quotes.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## SROI Methodology

### Impact Adjustments

| Factor | Description |
|---|---|
| Deadweight | What would have happened anyway without the program |
| Attribution | Contribution from other organisations or programs |
| Displacement | Unintended negative consequences |
| Drop-off | Annual decay of impact, applied from Year 2 onward |

### Formula

```
Net Y1  = Gross × (1 − Deadweight) × (1 − Attribution) × (1 − Displacement)
Net_t   = Net_Y1 × (1 − Drop-off)^(t−1)
PV_t    = Net_t / (1 + r)^t
NPV     = Σ PV_t  for t = 1 to duration
SROI    = Total NPV / Total Investment
```

### Projection Models

| Model | Description |
|---|---|
| Linear | Steady annual growth with fixed drop-off |
| Exponential | Compounding growth (continuous) |
| Logistic | Growth accelerates early then plateaus at capacity |

---

## License

MIT License © Strive - Sustainable Tourism Initiative

---

## Contact

Made with by the Strive Impact Team
