import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const where =
    session.user.role === "CEO"
      ? { companyId: session.user.companyId }
      : { companyId: session.user.companyId, departmentId: session.user.departmentId ?? "" };

  const employees = await prisma.employee.findMany({
    where: { ...where, employmentStatus: "ACTIVE" },
    include: { department: { select: { name: true, colorHex: true } } },
    orderBy: [{ department: { name: "asc" } }, { firstName: "asc" }],
  });

  const byDept = employees.reduce(
    (acc, e) => {
      const key = e.department?.name ?? "Unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
      return acc;
    },
    {} as Record<string, typeof employees>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Employees</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {employees.length} active employee{employees.length !== 1 ? "s" : ""}
        </p>
      </div>

      {employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Users className="h-8 w-8" />
            <p>No employees yet — hire someone from the Hiring page</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(Object.entries(byDept) as [string, typeof employees][]).map(([dept, deptEmployees]) => (
            <div key={dept}>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">{dept} ({deptEmployees.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {deptEmployees.map((emp) => (
                  <Card key={emp.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{emp.jobTitle ?? "—"}</p>
                          {emp.salary && (
                            <p className="text-xs text-muted-foreground">{formatCurrency(emp.salary)}/yr</p>
                          )}
                        </div>
                        <div
                          className="h-2 w-2 rounded-full shrink-0 mt-1"
                          style={{ backgroundColor: emp.department?.colorHex ?? "#888" }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
