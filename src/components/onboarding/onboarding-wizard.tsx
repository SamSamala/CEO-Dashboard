"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INDUSTRY_TEMPLATES } from "@/config/industry-templates.config";
import { applyTemplate, updateCompanyDetails } from "@/server/actions/setup.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, ChevronRight, ChevronLeft, Building2, LayoutTemplate, Settings, Rocket } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  industry: string | null;
  currency: string;
  timezone: string;
  fiscalYearEnd: number;
  onboardingCompleted: boolean;
}

interface DeptState {
  slug: string;
  name: string;
  colorHex: string;
  enabled: boolean;
}

const STEPS = [
  { id: 1, label: "Company", icon: Building2 },
  { id: 2, label: "Template", icon: LayoutTemplate },
  { id: 3, label: "Departments", icon: Settings },
  { id: 4, label: "Launch", icon: Rocket },
];

export function OnboardingWizard({ company }: { company: Company }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Company details
  const [companyName, setCompanyName] = useState(company.name);
  const [currency, setCurrency] = useState(company.currency);
  const [timezone, setTimezone] = useState(company.timezone);

  // Step 2: Template
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Step 3: Departments
  const [deptStates, setDeptStates] = useState<DeptState[]>([]);

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplate(templateId);
    const template = INDUSTRY_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setDeptStates(
        template.departments.map((d) => ({
          slug: d.slug,
          name: d.name,
          colorHex: d.colorHex,
          enabled: true,
        }))
      );
    } else {
      setDeptStates([]);
    }
  }

  async function handleFinish() {
    if (!selectedTemplate) return;
    setLoading(true);
    try {
      // Save company details
      const detailsResult = await updateCompanyDetails({
        name: companyName,
        currency,
        timezone,
        fiscalYearEnd: company.fiscalYearEnd,
      });
      if (detailsResult?.serverError) {
        toast.error(detailsResult.serverError);
        return;
      }

      // Apply template
      const result = await applyTemplate({
        templateId: selectedTemplate,
        departments: deptStates.map((d) => ({
          slug: d.slug,
          name: d.name,
          colorHex: d.colorHex,
          enabled: d.enabled,
        })),
      });

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      toast.success("Workspace configured successfully!");
      router.push("/dashboard");
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = s.id === step;
          const isDone = s.id < step;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
              }`}>
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Company Details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Company Details</CardTitle>
            <CardDescription>We&apos;ll use these to set up your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                  <option value="AUD">AUD — Australian Dollar</option>
                  <option value="SGD">SGD — Singapore Dollar</option>
                  <option value="INR">INR — Indian Rupee</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Central European (CET)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Asia/Singapore">Singapore (SGT)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Australia/Sydney">Sydney (AEST)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!companyName.trim()}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Template Selection */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Choose Your Industry Template</h2>
            <p className="text-muted-foreground text-sm mt-1">We&apos;ll pre-configure departments and KPIs for your industry.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INDUSTRY_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTemplateSelect(t.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  selectedTemplate === t.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <div className="font-semibold text-sm">{t.label}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-snug">{t.departments.length} departments</div>
                {selectedTemplate === t.id && (
                  <CheckCircle2 className="h-4 w-4 text-primary mt-2" />
                )}
              </button>
            ))}
          </div>
          {selectedTemplate && (
            <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
              {INDUSTRY_TEMPLATES.find((t) => t.id === selectedTemplate)?.description}
            </div>
          )}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!selectedTemplate}>
              Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Department Review */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Your Departments</CardTitle>
            <CardDescription>Enable or disable departments. You can add more later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTemplate === "CUSTOM" ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                You selected Custom setup. You&apos;ll add departments after setup in Settings → Departments.
              </p>
            ) : (
              deptStates.map((dept, i) => (
                <div key={dept.slug} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: dept.colorHex }} />
                  <div className="flex-1 min-w-0">
                    <Input
                      value={dept.name}
                      onChange={(e) => {
                        const next = [...deptStates];
                        next[i] = { ...dept, name: e.target.value };
                        setDeptStates(next);
                      }}
                      className="h-7 text-sm border-0 shadow-none px-0 font-medium bg-transparent focus-visible:ring-0"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const next = [...deptStates];
                      next[i] = { ...dept, enabled: !dept.enabled };
                      setDeptStates(next);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                      dept.enabled
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-muted text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {dept.enabled ? "Active" : "Skip"}
                  </button>
                </div>
              ))
            )}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(4)}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Launch */}
      {step === 4 && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Ready to launch!</CardTitle>
            <CardDescription>
              We&apos;ll create your workspace with{" "}
              {deptStates.filter((d) => d.enabled).length || "custom"} department(s),
              KPIs, alert rules, and bottleneck detection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
              <p className="font-medium">What gets created:</p>
              <ul className="space-y-1 text-muted-foreground">
                {deptStates.filter((d) => d.enabled).map((d) => (
                  <li key={d.slug} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {d.name} department + pre-configured KPIs
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  7 built-in alert rules
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  Bottleneck detection engine
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  CEO executive dashboard
                </li>
              </ul>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(3)} disabled={loading}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleFinish} disabled={loading}>
                {loading ? "Creating workspace…" : "Launch my OS"}
                {!loading && <Rocket className="ml-1.5 h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
