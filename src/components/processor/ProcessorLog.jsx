import { ScrollArea } from "@/components/ui/scroll-area";

export default function ProcessorLog({ entries }) {
  return (
    <div className="bg-gray-950 rounded-lg p-3">
      <p className="text-gray-500 text-xs font-mono mb-2">// Log de Processamento</p>
      <ScrollArea className="h-44">
        <div className="space-y-0.5">
          {entries.map((entry, i) => (
            <p key={i} className={`text-xs font-mono ${entry.type === "error" ? "text-red-400" : entry.type === "success" ? "text-green-400" : "text-gray-300"}`}>
              <span className="text-gray-600">[{entry.time}]</span> {entry.msg}
            </p>
          ))}
          {entries.length === 0 && (
            <p className="text-gray-600 text-xs font-mono">Aguardando início...</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}