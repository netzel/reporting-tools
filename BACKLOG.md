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

## Client profitability scatter (MSP)

Every client agreement plotted as gross margin % (y) vs revenue (x), bubble
size = seats or hours, quadrant lines at target margin and a revenue
threshold. Bottom-right quadrant = big and underpriced (renegotiation list),
bottom-left = fire or fix. Excel cannot label scatter points without
overlap; a deterministic label collision-avoidance engine is the core of
this build and is reusable by later charts. Input: paste three or four
columns from a PSA export (client, revenue, margin %, optional size).

## Revenue concentration Pareto (MSP)

Clients as ranked bars with a cumulative-share line and automatic callouts
("Top 10 = 62% of MRR"), with a rule that groups everyone below a threshold
into "Other". First thing lenders/acquirers/boards probe on an MSP; gets
rebuilt manually every quarter in Excel today.

## Landing page / tool switcher

Required BEFORE adding any second tool to this repo: a landing page at the
root that routes to each tool (waterfall chart builder, plus whatever comes
next), with the chart builder moving to its own path. Keep the current
waterfall URL working via redirect so existing links and bookmarks don't
break. Shared shell (topbar, account, saved charts) should carry across
tools.

## Other chart ideas discussed (uncommitted)

- Combo bar + line (revenue bars, margin % line) — two-axis version of the above
- Annotated trend chart with milestone flags and YoY callouts
- Tornado / sensitivity chart
- Cohort retention triangle
- Football field valuation ranges
- MRR movement chart (monthly new/expansion/churn columns with net line)
- Renewal cliff chart (MRR stacked by contract renewal quarter)
