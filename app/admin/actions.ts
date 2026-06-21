"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type CsvImportResult = {
  inserted: number;
  skipped: number;
  errors: string[];
};

// Parse a single CSV line, respecting double-quoted fields.
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Bulk-import employees from CSV text. Expected columns (order-independent,
 * case-insensitive header): employee_id, full_name, access_key, role
 *
 * role is optional — omitting it or leaving it blank defaults to 'user'.
 * Valid values: user, admin, dev.
 * Rows whose employee_id already exists in approved_employees are skipped.
 */
export async function importEmployeesFromCsv(
  csvText: string
): Promise<CsvImportResult | { error: string }> {
  const admin = createAdminClient();

  const lines = csvText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { error: "CSV must have a header row and at least one data row." };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const col = {
    employee_id: headers.indexOf("employee_id"),
    full_name: headers.indexOf("full_name"),
    access_key: headers.indexOf("access_key"),
    role: headers.indexOf("role"),
  };

  if (col.employee_id === -1 || col.full_name === -1 || col.access_key === -1) {
    return {
      error: "CSV header must include: employee_id, full_name, access_key",
    };
  }

  const rows = lines
    .slice(1)
    .map((line) => {
      const cells = parseCsvLine(line);
      const rawRole = col.role !== -1 ? cells[col.role]?.toLowerCase() : null;
      const role: "user" | "admin" | "dev" =
        rawRole === "admin" || rawRole === "dev" ? rawRole : "user";
      return {
        employee_id: cells[col.employee_id] ?? "",
        full_name: cells[col.full_name] ?? "",
        access_key: cells[col.access_key] ?? "",
        role,
      };
    })
    .filter((r) => r.employee_id && r.full_name && r.access_key);

  if (rows.length === 0) {
    return { error: "No valid rows found in CSV." };
  }

  // Fetch existing IDs so we can skip without an upsert touching registered rows
  const { data: existing, error: fetchError } = await admin
    .from("approved_employees")
    .select("*");

  if (fetchError) {
    return { error: `Failed to check existing employees: ${fetchError.message}` };
  }

  const existingIds = new Set((existing ?? []).map((e) => e.employee_id));
  const toInsert = rows.filter((r) => !existingIds.has(r.employee_id));
  const skipped = rows.length - toInsert.length;
  const errors: string[] = [];

  if (toInsert.length > 0) {
    const { error: insertError } = await admin
      .from("approved_employees")
      .insert(toInsert);

    if (insertError) {
      return { error: `Insert failed: ${insertError.message}` };
    }
  }

  return { inserted: toInsert.length, skipped, errors };
}

/**
 * Regenerate a 6-digit access key for an employee.
 * Works regardless of is_registered — allows both initial access and password reset.
 */
export async function regenerateAccessKey(
  employeeId: string
): Promise<{ accessKey?: string; error?: string }> {
  const admin = createAdminClient();

  const newKey = Math.floor(100000 + Math.random() * 900000).toString();

  const { error } = await admin
    .from("approved_employees")
    .update({ access_key: newKey })
    .eq("employee_id", employeeId);

  if (error) {
    return { error: error.message };
  }

  return { accessKey: newKey };
}
