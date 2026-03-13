import sql from "mssql";
import "dotenv/config";

// ── Configuration SQL Server ─────────────────────────────────────────────────
// Ces valeurs se règlent dans le fichier .env du bridge
//
// Deux modes d'authentification supportés :
//   - SQL Auth  : SQL_USER + SQL_PASSWORD renseignés  (mode par défaut Optimum)
//   - Windows Auth : SQL_WINDOWS_AUTH=true            (si SQL Server configuré en mode mixte)
//
const useWindowsAuth = process.env.SQL_WINDOWS_AUTH === "true";

const config: sql.config = {
  server: process.env.SQL_SERVER || "localhost\\SQLEXPRESS",
  port: parseInt(process.env.SQL_PORT || "1433", 10),
  database: process.env.SQL_DATABASE || "Optimum",
  ...(useWindowsAuth
    ? {
        // Windows Integrated Auth — pas de user/password
        domain: process.env.SQL_DOMAIN || undefined,
        authentication: { type: "ntlm", options: { domain: process.env.SQL_DOMAIN || "", userName: "", password: "" } },
      }
    : {
        user: process.env.SQL_USER || "sa",
        password: process.env.SQL_PASSWORD || "",
      }),
  options: {
    encrypt: process.env.SQL_ENCRYPT === "true",
    trustServerCertificate: true, // nécessaire pour SQL Server local sans cert
    enableArithAbort: true,
  },
  connectionTimeout: 10000,
  requestTimeout: 15000,
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) return pool;
  pool = await new sql.ConnectionPool(config).connect();
  return pool;
}

export async function testConnection(): Promise<boolean> {
  try {
    const p = await getPool();
    await p.request().query("SELECT 1 AS ok");
    return true;
  } catch (err) {
    console.error("[DB] Erreur connexion SQL Server :", (err as Error).message);
    return false;
  }
}

// ── Helper : découverte du schéma Optimum ────────────────────────────────────
// Utilisé lors de la configuration initiale pour identifier les bonnes tables
export async function discoverSchema(): Promise<{ table: string; columns: string[] }[]> {
  const p = await getPool();
  const result = await p.request().query(`
    SELECT t.name AS table_name, c.name AS column_name
    FROM sys.tables t
    JOIN sys.columns c ON t.object_id = c.object_id
    WHERE t.type = 'U'
    ORDER BY t.name, c.column_id
  `);

  const map = new Map<string, string[]>();
  for (const row of result.recordset) {
    const cols = map.get(row.table_name) || [];
    cols.push(row.column_name);
    map.set(row.table_name, cols);
  }

  return Array.from(map.entries()).map(([table, columns]) => ({ table, columns }));
}

export { sql };
