// One-off maintenance script (run once, after the SQL migration in
// 005_decouple_forms_repository.sql): physically moves any pre-existing
// post attachment still sitting in public/uploads/forms_repository/ over to
// public/uploads/posts/ (where the decoupled routes now write new uploads),
// and updates that row's file_path to match.
//
// Safe to re-run: once a row's file_path no longer starts with
// "/uploads/forms_repository/", it's skipped on the next run.
//
// Usage (from the backend/ directory):
//   node database/migrations/zumi/forms-repository/006_relocate_legacy_attachments.js
import pkg from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

const OLD_PREFIX = "/uploads/forms_repository/";
const NEW_PREFIX = "/uploads/posts/";
const PUBLIC_DIR = path.join(process.cwd(), "public");

const TABLES = ["ojt_post_files", "nstp_post_files", "researchextension_post_files"];

async function relocateTable(table) {
  const { rows } = await pool.query(
    `SELECT id, file_path FROM ${table} WHERE file_path LIKE $1`,
    [`${OLD_PREFIX}%`],
  );

  let moved = 0;
  let missing = 0;

  for (const row of rows) {
    const filename = row.file_path.slice(OLD_PREFIX.length);
    const oldAbsolute = path.join(PUBLIC_DIR, "uploads", "forms_repository", filename);
    const newAbsolute = path.join(PUBLIC_DIR, "uploads", "posts", filename);

    if (!fs.existsSync(oldAbsolute)) {
      console.warn(`  [${table}] MISSING on disk, left as-is: ${row.file_path}`);
      missing++;
      continue;
    }

    fs.mkdirSync(path.dirname(newAbsolute), { recursive: true });
    fs.renameSync(oldAbsolute, newAbsolute);

    const newPath = NEW_PREFIX + filename;
    await pool.query(`UPDATE ${table} SET file_path = $1 WHERE id = $2`, [newPath, row.id]);
    moved++;
  }

  console.log(`[${table}] moved ${moved}, missing ${missing}, total candidates ${rows.length}`);
}

async function main() {
  for (const table of TABLES) {
    await relocateTable(table);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
