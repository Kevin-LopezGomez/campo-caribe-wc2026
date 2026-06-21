import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminEmployeesClient, type EmployeeRow } from "./employees-client";

async function EmployeesData() {
  const admin = createAdminClient();
  const { data: employees, error } = await admin
    .from("approved_employees")
    .select("id, employee_id, full_name, job_title, home_department, division, is_registered, access_key")
    .not("employee_id", "like", "TEST%")
    .order("full_name");

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load employees: {error.message}
      </div>
    );
  }

  return <AdminEmployeesClient employees={(employees ?? []) as EmployeeRow[]} />;
}

function EmployeesSkeleton() {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-11 bg-muted/40 animate-pulse border-b border-border last:border-0" />
      ))}
    </div>
  );
}

export default function AdminEmployeesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Employees</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Look up access keys and registration status
        </p>
      </div>
      <Suspense fallback={<EmployeesSkeleton />}>
        <EmployeesData />
      </Suspense>
    </div>
  );
}
