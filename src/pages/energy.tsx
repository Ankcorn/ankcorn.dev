import { Hono } from "hono";
import type { Child, FC } from "hono/jsx";
import { Layout } from "../layout";
import {
  getSummary,
  getFuelMix,
  getDailyUsage,
  getWeeklyUsage,
  getHalfHourlyUsage,
  type DailyUsage,
  type FuelPcts,
  type WeeklyUsage,
} from "../utils/energy";

const app = new Hono();

// --- Constants ---

const FUELS: { key: keyof FuelPcts; label: string; color: string }[] = [
  { key: "wind_pct", label: "Wind", color: "#2ea043" },
  { key: "gas_pct", label: "Gas", color: "#da6d28" },
  { key: "nuclear_pct", label: "Nuclear", color: "#8b5cf6" },
  { key: "imports_pct", label: "Imports", color: "#6e7681" },
  { key: "solar_pct", label: "Solar", color: "#e3b341" },
  { key: "biomass_pct", label: "Biomass", color: "#3fb950" },
  { key: "hydro_pct", label: "Hydro", color: "#58a6ff" },
  { key: "coal_pct", label: "Coal", color: "#8b949e" },
];

const LEVEL_BG = ["#1a1a1a", "#2d4a1e", "#3d6b27", "#4e8c30", "#5fad39"];
const LEVEL_BG_DARK = ["#111", "#14391a", "#1a5c25", "#22802e", "#2ea043"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_MS = 86400000;

// --- Helpers ---

function percentile(sorted: number[], p: number): number {
  const i = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  if (lo + 1 >= sorted.length) return sorted[lo];
  return sorted[lo] + (i - lo) * (sorted[lo + 1] - sorted[lo]);
}

function thresholds(values: number[]): number[] {
  const s = [...values].sort((a, b) => a - b);
  return [20, 40, 60, 80].map((p) => percentile(s, p));
}

function getLevel(kwh: number, t: number[]): number {
  for (let i = 0; i < 4; i++) if (kwh <= t[i]) return i;
  return 4;
}

function dateStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", opts);
}

function monthLabelsFromDates(
  dates: string[],
): { label: string; idx: number }[] {
  const out: { label: string; idx: number }[] = [];
  let prev = -1;
  for (let i = 0; i < dates.length; i++) {
    const m = new Date(dates[i] + "T12:00:00").getMonth();
    if (m !== prev) {
      out.push({ label: fmtDate(dates[i], { month: "short" }), idx: i });
      prev = m;
    }
  }
  return out;
}

// --- Components ---

const Tooltip: FC<{ children: Child }> = ({ children }) => (
  <div class="tt bg-neutral-900/95 dark:bg-neutral-100/95 text-white dark:text-neutral-900">
    {children}
  </div>
);

const SvgLabel: FC<{
  x: number;
  y: number;
  anchor?: string;
  baseline?: string;
  children: Child;
}> = ({ x, y, anchor = "end", baseline = "middle", children }) => (
  <text
    x={x}
    y={y}
    text-anchor={anchor}
    dominant-baseline={baseline}
    fill="currentColor"
    fill-opacity="0.25"
    font-size="7"
    font-family="'Space Mono', monospace"
  >
    {children}
  </text>
);

// --- Route ---

app.get("/", (c) => {
  const summary = getSummary();
  const fuelMix = getFuelMix();
  const daily = getDailyUsage();
  const weeklyRaw = getWeeklyUsage();
  const halfHourly = getHalfHourlyUsage();

  // -- Grid date range (full year, Sunday-aligned) --
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  oneYearAgo.setDate(oneYearAgo.getDate() + 1);
  const gridStartMs = oneYearAgo.getTime() - oneYearAgo.getDay() * DAY_MS;
  const gridEndMs = today.getTime() + (6 - today.getDay()) * DAY_MS;
  const totalDays = Math.round((gridEndMs - gridStartMs) / DAY_MS) + 1;
  const numWeeks = Math.ceil(totalDays / 7);

  // -- Daily lookup --
  const dayMap = new Map<string, DailyUsage>();
  for (const d of daily) dayMap.set(d.date, d);

  // -- Build weeks grid --
  const weeks: (DailyUsage | null)[][] = [];
  for (let w = 0; w < numWeeks; w++) {
    const week: (DailyUsage | null)[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(
        dayMap.get(dateStr(gridStartMs + (w * 7 + d) * DAY_MS)) ?? null,
      );
    }
    weeks.push(week);
  }

  // -- Month labels for week columns --
  const weekMonths: { label: string; col: number }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < numWeeks; w++) {
    const dt = new Date(gridStartMs + w * 7 * DAY_MS);
    const m = dt.getMonth();
    if (m !== lastMonth) {
      weekMonths.push({
        label: dt.toLocaleDateString("en-US", { month: "short" }),
        col: w,
      });
      lastMonth = m;
    }
  }

  // -- Daily thresholds --
  const dailyThresholds = thresholds(daily.map((d) => d.consumption_kwh));

  // -- Fuel mix entries (sorted by value) --
  const fuelEntries = FUELS.map((f) => ({
    ...f,
    value: fuelMix[f.key],
  }))
    .filter((f) => f.value > 0)
    .sort((a, b) => b.value - a.value);
  const totalFuel = fuelEntries.reduce((s, f) => s + f.value, 0);

  // -- Weekly stacked chart --
  const weeklyMap = new Map<string, WeeklyUsage>();
  for (const w of weeklyRaw) weeklyMap.set(w.week_start, w);
  const weeklySlots = weeks.map(
    (_, w) => weeklyMap.get(dateStr(gridStartMs + w * 7 * DAY_MS)) ?? null,
  );

  const SVG_W = 700;
  const mixH = 180;
  const mixPad = { l: 38, r: 4, t: 4, b: 22 };
  const mixInnerW = SVG_W - mixPad.l - mixPad.r;
  const mixInnerH = mixH - mixPad.t - mixPad.b;
  const mixBarW = numWeeks > 0 ? mixInnerW / numWeeks : 1;
  const mixX = (i: number) => mixPad.l + i * mixBarW;
  const maxKwh =
    Math.ceil(
      Math.max(...weeklySlots.map((w) => w?.consumption_kwh ?? 0)) / 10,
    ) * 10;
  const mixY = (kwh: number) =>
    mixPad.t + mixInnerH - (kwh / maxKwh) * mixInnerH;
  const mixYTicks = Array.from({ length: 5 }, (_, i) =>
    Math.round((maxKwh / 4) * i),
  );

  // -- Half-hourly heatmap --
  const hhMap = new Map<string, number>();
  for (const h of halfHourly)
    hhMap.set(`${h.date}|${h.time_slot}`, h.consumption_kwh);
  const hhDates = [...new Set(halfHourly.map((h) => h.date))].sort();
  const hhLabels = hhDates.map((d) =>
    fmtDate(d, { month: "short", day: "numeric" }),
  );
  const hhThresholds = thresholds(halfHourly.map((h) => h.consumption_kwh));
  const hhMonths = monthLabelsFromDates(hhDates);

  const timeSlots: string[] = [];
  for (let i = 0; i < 48; i++) {
    const hh = String(Math.floor(i / 2)).padStart(2, "0");
    timeSlots.push(`${hh}:${i % 2 === 0 ? "00" : "30"}`);
  }

  const hhPad = { l: 36, r: 4, t: 4, b: 22 };
  const hhH = 300;
  const hhCellW = (SVG_W - hhPad.l - hhPad.r) / hhDates.length;
  const hhCellH = (hhH - hhPad.t - hhPad.b) / 48;

  const dateRange = `${fmtDate(summary.earliest, { month: "short", year: "numeric" })} – ${fmtDate(summary.latest, { month: "short", year: "numeric" })}`;

  return c.html(
    <Layout showFooter>
      <style>{`
        .tt {
          display: none; position: absolute; z-index: 50;
          bottom: 100%; left: 50%; transform: translateX(-50%);
          margin-bottom: 8px; padding: 8px 12px;
          font-size: 11px; white-space: nowrap;
          pointer-events: none; line-height: 1.6;
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
        }
        .has-tt { position: relative; z-index: 1; cursor: pointer; }
        .has-tt:hover { z-index: 51; }
        .has-tt:hover .tt { display: block; }
        .stat-value { font-variant-numeric: tabular-nums; }
      `}</style>

      {/* Hero stat */}
      <div class="mb-10">
        <div class="flex items-baseline gap-3 mb-1">
          <span class="text-3xl font-bold stat-value">{summary.total_kwh}</span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            kWh consumed
          </span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {dateRange} · {summary.total_days} days tracked
        </div>
      </div>

      {/* Stats row */}
      <div class="flex gap-8 mb-10 text-sm">
        <div>
          <div class="text-gray-500 dark:text-gray-400 text-xs mb-1">
            daily avg
          </div>
          <div class="font-bold stat-value">
            {(summary.total_kwh / summary.total_days).toFixed(1)}{" "}
            <span class="font-normal text-gray-500 dark:text-gray-400">
              kWh
            </span>
          </div>
        </div>
        <div>
          <div class="text-gray-500 dark:text-gray-400 text-xs mb-1">
            carbon intensity
          </div>
          <div class="font-bold stat-value">
            {summary.avg_carbon_intensity}{" "}
            <span class="font-normal text-gray-500 dark:text-gray-400">
              g/kWh
            </span>
          </div>
        </div>
      </div>

      {/* Fuel mix bar */}
      <div class="mb-10">
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">
          grid fuel mix
        </div>
        <div class="flex h-3 w-full" style="gap: 1px;">
          {fuelEntries.map((f) => (
            <div
              class="has-tt"
              style={`width:${(f.value / totalFuel) * 100}%;background:${f.color}`}
            >
              <Tooltip>
                <div class="font-bold">{f.label}</div>
                <div class="stat-value">{f.value}%</div>
              </Tooltip>
            </div>
          ))}
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
          {fuelEntries.map((f) => (
            <span class="flex items-center gap-1.5">
              <span
                style={`width:8px;height:8px;background:${f.color};display:inline-block`}
              />
              <span class="text-gray-500 dark:text-gray-400">{f.label}</span>
              <span class="font-bold">{f.value}%</span>
            </span>
          ))}
        </div>
      </div>

      {/* Stacked bar chart */}
      <div class="mb-10">
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          weekly consumption by source (kWh)
        </div>
        <svg
          viewBox={`0 0 ${SVG_W} ${mixH}`}
          width="100%"
          style="display:block"
        >
          {mixYTicks.map((kwh) => (
            <g>
              <line
                x1={mixPad.l}
                y1={mixY(kwh)}
                x2={SVG_W - mixPad.r}
                y2={mixY(kwh)}
                stroke="currentColor"
                stroke-opacity="0.06"
                stroke-width="0.5"
              />
              <SvgLabel x={mixPad.l - 4} y={mixY(kwh) + 1}>
                {kwh}
              </SvgLabel>
            </g>
          ))}
          {weeklySlots.map((w, i) => {
            if (!w) return null;
            let cum = 0;
            return (
              <g>
                {FUELS.map((f) => {
                  const pct = w[f.key];
                  if (pct <= 0) return null;
                  const kwh = (pct / 100) * w.consumption_kwh;
                  const y = mixY(cum + kwh);
                  const h = mixY(cum) - y;
                  cum += kwh;
                  return (
                    <rect
                      x={mixX(i)}
                      y={y}
                      width={Math.max(mixBarW - 0.5, 0.5)}
                      height={Math.max(h, 0)}
                      fill={f.color}
                      fill-opacity="0.85"
                    >
                      <title>{`${f.label} ${kwh.toFixed(1)} kWh (${pct}%)`}</title>
                    </rect>
                  );
                })}
              </g>
            );
          })}
          {weekMonths.map((m) => (
            <SvgLabel x={mixX(m.col)} y={mixH - 4} anchor="start">
              {m.label}
            </SvgLabel>
          ))}
        </svg>
      </div>

      {/* Contribution graph */}
      {(() => {
        const cgPad = { l: 28, r: 4, t: 16, b: 22 };
        const cgCellSize = 10;
        const cgGap = 2.5;
        const cgStep = cgCellSize + cgGap;
        const cgW = cgPad.l + numWeeks * cgStep + cgPad.r;
        const cgH = cgPad.t + 7 * cgStep + cgPad.b;
        return (
          <div class="mb-8">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-3">
              daily consumption
            </div>
            <svg
              viewBox={`0 0 ${cgW} ${cgH}`}
              width="100%"
              style="display:block"
            >
              {/* Month labels */}
              {weekMonths.map((m) => (
                <SvgLabel
                  x={cgPad.l + m.col * cgStep}
                  y={6}
                  anchor="start"
                  baseline="middle"
                >
                  {m.label}
                </SvgLabel>
              ))}
              {/* Day labels */}
              {[0, 2, 4].map((row) => (
                <SvgLabel
                  x={cgPad.l - 4}
                  y={cgPad.t + row * cgStep + cgCellSize / 2}
                >
                  {DAY_LABELS[row]}
                </SvgLabel>
              ))}
              {/* Cells */}
              {[0, 1, 2, 3, 4, 5, 6].map((row) =>
                weeks.map((week, wi) => {
                  const di = (row + 1) % 7;
                  const day = week[di];
                  const level = day
                    ? getLevel(day.consumption_kwh, dailyThresholds)
                    : 0;
                  return (
                    <rect
                      x={cgPad.l + wi * cgStep}
                      y={cgPad.t + row * cgStep}
                      width={cgCellSize}
                      height={cgCellSize}
                      fill={LEVEL_BG_DARK[level]}
                    >
                      {day && (
                        <title>{`${dateStr(gridStartMs + (wi * 7 + di) * DAY_MS)} · ${day.consumption_kwh} kWh`}</title>
                      )}
                    </rect>
                  );
                }),
              )}
            </svg>
            <div class="flex items-center justify-end gap-1 mt-3 text-xs text-gray-600 dark:text-gray-500">
              <span>Less</span>
              {LEVEL_BG_DARK.map((bg) => (
                <div
                  style={`width:10px;height:10px;background:${bg};display:inline-block`}
                />
              ))}
              <span>More</span>
            </div>
          </div>
        );
      })()}

      {/* Half-hourly heatmap */}
      <div class="mb-8">
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          consumption by time of day
        </div>
        <svg viewBox={`0 0 ${SVG_W} ${hhH}`} width="100%" style="display:block">
          {[0, 4, 8, 12, 16, 20].map((hr) => (
            <SvgLabel
              x={hhPad.l - 4}
              y={hhPad.t + hr * 2 * hhCellH + hhCellH / 2}
            >
              {String(hr).padStart(2, "0")}:00
            </SvgLabel>
          ))}
          {hhDates.map((date, di) => (
            <g>
              {timeSlots.map((slot, si) => {
                const kwh = hhMap.get(`${date}|${slot}`);
                if (kwh === undefined) return null;
                const level = getLevel(kwh, hhThresholds);
                return (
                  <rect
                    x={hhPad.l + di * hhCellW}
                    y={hhPad.t + si * hhCellH}
                    width={Math.max(hhCellW - 0.3, 0.3)}
                    height={Math.max(hhCellH - 0.3, 0.3)}
                    fill={LEVEL_BG_DARK[level]}
                  >
                    <title>{`${hhLabels[di]} ${slot} · ${kwh} kWh`}</title>
                  </rect>
                );
              })}
            </g>
          ))}
          {hhMonths.map((m) => (
            <SvgLabel x={hhPad.l + m.idx * hhCellW} y={hhH - 4} anchor="start">
              {m.label}
            </SvgLabel>
          ))}
        </svg>
      </div>
    </Layout>,
  );
});

export default app;
