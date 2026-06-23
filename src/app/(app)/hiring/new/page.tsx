import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { HiringRequestForm } from "@/components/hiring/hiring-request-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "New Hiring Request" };

export default async function NewHiringPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const departments = await prisma.department.findMany({
    where: { companyId: session.user.companyId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (departments.length === 0) {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6">New Hiring Request</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Building2 className="h-8 w-8" />
            <p className="font-medium text-foreground">No departments found</p>
            <p className="text-sm text-center">
              You need to create at least one department before submitting a hiring request.
            </p>
            <Link href="/departments">
              <Button>Go to Departments</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Hiring Request</h1>
      <HiringRequestForm departments={departments} />
    </div>
  );
}
