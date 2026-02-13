import { Database } from "bun:sqlite";
import { join } from "path";

const dbPath =
  process.env.ENERGY_DB_PATH ?? join(import.meta.dir, "../../octonerd.db");
const db = new Database(dbPath, { readonly: true });

const FUEL_COLS = `
  ROUND(AVG(wind_pct), 1) as wind_pct,
  ROUND(AVG(gas_pct), 1) as gas_pct,
  ROUND(AVG(nuclear_pct), 1) as nuclear_pct,
  ROUND(AVG(solar_pct), 1) as solar_pct,
  ROUND(AVG(hydro_pct), 1) as hydro_pct,
  ROUND(AVG(biomass_pct), 1) as biomass_pct,
  ROUND(AVG(imports_pct), 1) as imports_pct,
  ROUND(AVG(coal_pct), 1) as coal_pct`;

export interface FuelPcts {
  wind_pct: number;
  gas_pct: number;
  nuclear_pct: number;
  solar_pct: number;
  hydro_pct: number;
  biomass_pct: number;
  imports_pct: number;
  coal_pct: number;
}

export interface Summary {
  total_kwh: number;
  avg_carbon_intensity: number;
  earliest: string;
  latest: string;
  total_days: number;
}

export type DailyUsage = FuelPcts & {
  date: string;
  consumption_kwh: number;
  avg_carbon_intensity: number;
};

export type WeeklyUsage = FuelPcts & {
  week_start: string;
  consumption_kwh: number;
  avg_carbon_intensity: number;
};

export interface HalfHourlyUsage {
  date: string;
  time_slot: string;
  consumption_kwh: number;
}

export function getSummary(): Summary {
  return db
    .query(
      `SELECT
        ROUND(SUM(consumption_kwh), 2) as total_kwh,
        ROUND(AVG(carbon_intensity), 1) as avg_carbon_intensity,
        MIN(DATE(interval_start)) as earliest,
        MAX(DATE(interval_start)) as latest,
        COUNT(DISTINCT DATE(interval_start)) as total_days
      FROM energy_usage`,
    )
    .get() as Summary;
}

export function getFuelMix(): FuelPcts {
  return db.query(`SELECT ${FUEL_COLS} FROM energy_usage`).get() as FuelPcts;
}

export function getDailyUsage(): DailyUsage[] {
  return db
    .query(
      `SELECT
        DATE(interval_start) as date,
        ROUND(SUM(consumption_kwh), 2) as consumption_kwh,
        ROUND(AVG(carbon_intensity), 1) as avg_carbon_intensity,
        ${FUEL_COLS}
      FROM energy_usage
      GROUP BY DATE(interval_start)
      ORDER BY date ASC`,
    )
    .all() as DailyUsage[];
}

export function getWeeklyUsage(): WeeklyUsage[] {
  return db
    .query(
      `SELECT
        DATE(interval_start, '-' || strftime('%w', interval_start) || ' days') as week_start,
        ROUND(SUM(consumption_kwh), 2) as consumption_kwh,
        ROUND(AVG(carbon_intensity), 1) as avg_carbon_intensity,
        ${FUEL_COLS}
      FROM energy_usage
      GROUP BY week_start
      ORDER BY week_start ASC`,
    )
    .all() as WeeklyUsage[];
}

export function getHalfHourlyUsage(): HalfHourlyUsage[] {
  return db
    .query(
      `SELECT
        DATE(interval_start) as date,
        strftime('%H:%M', interval_start) as time_slot,
        ROUND(consumption_kwh, 4) as consumption_kwh
      FROM energy_usage
      ORDER BY interval_start ASC`,
    )
    .all() as HalfHourlyUsage[];
}
