import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("coachperiod.db");

export function initDb() {
  db.execSync(
    `
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      ageBand TEXT NOT NULL,
      daysPerWeek INTEGER NOT NULL,
      goal TEXT NOT NULL,
      equipment TEXT NOT NULL,
      level INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      classId TEXT NOT NULL,
      rpe INTEGER NOT NULL,
      technique TEXT NOT NULL,
      attendance INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS training_plans (
      id TEXT PRIMARY KEY NOT NULL,
      classId TEXT NOT NULL,
      title TEXT NOT NULL,
      warmup TEXT NOT NULL,
      main TEXT NOT NULL,
      cooldown TEXT NOT NULL,
      warmupTime TEXT NOT NULL,
      mainTime TEXT NOT NULL,
      cooldownTime TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `
  );

  try {
    db.execSync(
      "ALTER TABLE training_plans ADD COLUMN classId TEXT NOT NULL DEFAULT ''"
    );
  } catch {}
  try {
    db.execSync(
      "ALTER TABLE training_plans ADD COLUMN warmupTime TEXT NOT NULL DEFAULT ''"
    );
  } catch {}
  try {
    db.execSync(
      "ALTER TABLE training_plans ADD COLUMN mainTime TEXT NOT NULL DEFAULT ''"
    );
  } catch {}
  try {
    db.execSync(
      "ALTER TABLE training_plans ADD COLUMN cooldownTime TEXT NOT NULL DEFAULT ''"
    );
  } catch {}
}
