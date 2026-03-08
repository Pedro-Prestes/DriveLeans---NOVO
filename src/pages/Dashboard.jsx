import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Files, HardDrive, Clock, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import MetricCard from "../components/dashboard/MetricCard";

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.ControleProcessamento.list("-updated_date", 100);
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const concluidos = records.filter(r => r.status === "concluido");
  const totalArquivos = records.length;
  const totalMB = records.reduce((acc, r) => acc + (r.file_size || 0), 0) / 1024 / 1024;

  const temposValidos = concluidos.filter(r => r.processing_time_seconds > 0);
  const tempoMedio = temposValidos.length > 0
    ? temposValidos.reduce((acc, r) => acc + r.processing_time_seconds, 0) / temposValidos.length
    : null;

  const ultimos5 = concluidos.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Métricas de processamento de arquivos</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total de Arquivos"
            value={totalArquivos}
            sub={`${concluidos.length} concluídos`}
            icon={Files}
            color="blue"
          />
          <MetricCard
            title="Volume Processado"
            value={`${totalMB.toFixed(1)} MB`}
            sub="Tamanho total acumulado"
            icon={HardDrive}
            color="purple"
          />
          <MetricCard
            title="Tempo Médio"
            value={tempoMedio !== null ? `${tempoMedio.toFixed(0)}s` : "—"}
            sub="Por arquivo concluído"
            icon={Clock}
            color="orange"
          />
          <MetricCard
            title="Concluídos"
            value={concluidos.length}
            sub={`de ${totalArquivos} registros`}
            icon={CheckCircle}
            color="green"
          />
        </div>

        {/* Últimos 5 concluídos */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Últimos 5 Arquivos Concluídos</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Carregando...
            </div>
          ) : ultimos5.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Nenhum arquivo concluído ainda.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Arquivo</th>
                  <th className="px-5 py-3 text-left">Tamanho</th>
                  <th className="px-5 py-3 text-left">Chunks</th>
                  <th className="px-5 py-3 text-left">Concluído em</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ultimos5.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-600 max-w-[160px] truncate">
                      {r.file_name || r.file_id}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {r.file_size ? `${(r.file_size / 1024 / 1024).toFixed(2)} MB` : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-700">{r.chunks_processed ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {r.updated_date
                        ? format(new Date(r.updated_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge className="bg-green-100 text-green-800 text-xs">Concluído</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}