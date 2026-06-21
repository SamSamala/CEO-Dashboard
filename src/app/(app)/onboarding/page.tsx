import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { id: true, name: true, industry: true, currency: true, timezone: true, fiscalYearEnd: true, onboardingCompleted: true },
  });

  if (!company) redirect("/login");

  // If already completed, redirect to dashboard
  if (company.onboardingCompleted) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <OnboardingWizard company={company} />
    </div>
  );
}
