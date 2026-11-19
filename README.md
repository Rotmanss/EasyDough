# EasyDough

A simple sourdough calculator for phone and computer. Enter your flour and the app tells you exactly how much levain, water and salt to weigh. It also tells you how to feed your starter to make the levain, with nothing thrown away.

**Open the app:** https://rotmanss.github.io/EasyDough/

## Install it like an app

**iPhone**
1. Open the link above in **Safari**.
2. Tap **Share** → **Add to Home Screen**.

**Windows**
1. Open the link in **Edge** or **Chrome**.
2. Click the **Install** icon in the address bar.

It works offline after the first visit. Your starter and recipe are saved on each device only — they are not uploaded anywhere and are not shared between devices.

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
