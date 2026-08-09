# Backlog

Possible future builds. Nothing here is committed work.

## Triple-overlay combo chart (bar + line + background context series)

The one chart Excel genuinely can't do: three variables where the third is
visual context rather than a real series. Example use case: total leads
(bars), lead conversion % (line), and total advertising spend (faint filled
area or wide translucent bars in the background). Effectively three axes,
but the third axis is never drawn — the context series is normalized to the
plot height and rendered muted (low-opacity fill, no data labels, one legend
entry like "Ad spend (indexed)").

Design notes:
- Reuse the existing shell: paste import, debounced table editing, style
  controls, save/cloud sync, composed PNG export all carry over.
- Data model: one label column + three value columns (bar, line, context).
- Bar series on the left axis, line series on the right axis, context series
  scaled to fit the plot area with no axis of its own.
- Context series must never obscure the foreground: draw first, cap opacity,
  muted default color.

## Other chart ideas discussed (uncommitted)

- Combo bar + line (revenue bars, margin % line) — two-axis version of the above
- Annotated trend chart with milestone flags and YoY callouts
- Tornado / sensitivity chart
- Cohort retention triangle
- Football field valuation ranges
- Client profitability scatter and revenue-concentration Pareto (MSP-specific)
