# EasyDough

A simple sourdough calculator for phone and computer. Enter your flour and the app tells you exactly how much levain, water and salt to weigh. It also tells you how to feed your starter to make the levain, with nothing thrown away.

**Open the app:** https://rotmanss.github.io/EasyDough/

## What it does

**Recipe**
- Enter the flour you add, dough hydration, salt and levain (in % or grams).
- Get the exact amounts to weigh: levain, flour, water, salt and dough weight.
- Optional flour types (whole wheat, rye…) taken out of the same flour.
- Optional extras: dry ones (seeds, nuts) or liquid ones (milk, honey, butter). Liquids count as dough water.
- Salt is also shown in teaspoons.

**Starter & levain**
- Save the starter you keep in the fridge (weight and hydration).
- Make the levain: take some starter, the app tells you how much flour and water to add. Part goes into the dough, the rest goes back to the fridge as your new starter.
- Optionally choose the flour ratio yourself (e.g. 1 : 3).

**How it works**
- Every number has a "Show how" link with the formula and the real values used.
- A help tab explains all words and formulas in plain language.

## Install it like an app

**iPhone**
1. Open the link above in **Safari**.
2. Tap **Share** → **Add to Home Screen**.

**Windows**
1. Open the link in **Edge** or **Chrome**.
2. Click the **Install** icon in the address bar.

It works offline after the first visit. Your starter and recipe are saved on each device only — they are not uploaded anywhere and are not shared between devices.

## Hydration in one line

Hydration = water ÷ flour × 100. So 70% means 70 g of water for every 100 g of flour. Dough, levain and starter can be at most 100%.

## For developers

Built with React, TypeScript and Vite. No server — everything runs in the browser.

```bash
npm install        # once
npm run dev        # start at http://localhost:5173
npm test           # run the calculation tests
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run icons      # regenerate app icons
```

### Project layout

```
src/
  lib/          calculations (no React) + their tests
    sourdough.ts    recipe and levain maths
    starterLog.ts   saved starter and undo
    explain.ts      "Show how" texts
    format.ts       number display (rounding happens only here)
  features/
    recipe/     Recipe tab
    starter/    Starter & Levain tab
    reference/  How it works tab
  components/   shared UI pieces
  hooks/        state and saving to the device
```

All calculations keep full precision; numbers are only rounded when shown.

### Deploying

Every push to `main` runs the tests and publishes the app to GitHub Pages
(see `.github/workflows/deploy.yml`). In the repository settings, **Pages → Source** must be set to **GitHub Actions**.
