# Waterfall Chart Builder

Free, browser-based waterfall (bridge) chart builder. No sign-up, no server — everything runs locally in your browser.

**Live app:** https://reportingtools.vercel.app/

![Waterfall Chart Builder preview](preview.png)

## Features

- **Increases, decreases, anchors, and subtotals** — build a full revenue or P&L bridge with drag-to-reorder rows
- **Tie-out mode** — set a known end value (e.g. FY24 Revenue) and an "All other, net" plug bar is calculated automatically so the chart always ties out
- **Paste from a spreadsheet** — tab- or space-separated data imports directly; opening/closing anchors are auto-detected, and accountant-style negatives like `(480)` are understood
- **Group brackets** — label spans of bars below the axis with a bracket and net sum (e.g. "Existing Customers")
- **Full styling control** — colors (custom picker), number format and scale, decimals, fonts, gridlines, bar width, axis bounds
- **Save & export** — save charts in your browser and export a presentation-ready PNG including the title, subtitle, legend, and footnote

## Running locally

Clone the repo and open `index.html` in a browser. The app is fully self-contained — Chart.js is vendored in `vendor/`, so it works offline.

## License

[MIT](LICENSE)
