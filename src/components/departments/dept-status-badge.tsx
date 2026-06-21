import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DeptStatusBadgeProps {
  status: "green" | "orange" | "red" | "gray";
  className?: string;
}

const STATUS_CONFIG = {
  green: { label: "Healthy", className: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  orange: { label: "Warning", className: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  red: { label: "Critical", className: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  gray: { label: "No Data", className: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" },
};

export function DeptStatusBadge({ status, className }: DeptStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.gray;
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full inline-block", config.dot)} />
      {config.label}
    </Badge>
  );
}
