import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const config = {
  pendente:    { label: "Pendente",     icon: Clock,        cls: "bg-yellow-100 text-yellow-800" },
  processando: { label: "Processando",  icon: Loader2,      cls: "bg-blue-100 text-blue-800", spin: true },
  concluido:   { label: "Concluído",    icon: CheckCircle,  cls: "bg-green-100 text-green-800" },
  erro:        { label: "Erro",         icon: AlertCircle,  cls: "bg-red-100 text-red-800" },
};

export default function StatusBadge({ status }) {
  const c = config[status] || config.pendente;
  const Icon = c.icon;
  return (
    <Badge className={`${c.cls} flex items-center gap-1`}>
      <Icon className={`w-3 h-3 ${c.spin ? "animate-spin" : ""}`} />
      {c.label}
    </Badge>
  );
}