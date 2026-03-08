import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Play, Square, RefreshCw, Trash2 } from "lucide-react";
import ChunkProgressBar from "../components/processor/ChunkProgressBar";
import StatusBadge from "../components/processor/StatusBadge";
import ProcessorLog from "../components/processor/ProcessorLog";

// Calcula dinamicamente o chunk size baseado no tamanho do arquivo
function getChunkSize(fileSize) {
  if (!fileSize) return 1_048_576; // 1MB padrão se tamanho desconhecido
  if (fileSize < 10_000_000)   return 512_000;        // < 10MB  → 512KB
  if (fileSize < 100_000_000)  return 2_097_152;       // < 100MB → 2MB
  if (fileSize < 500_000_000)  return 5_242_880;       // < 500MB → 5MB
  return 10_485_760;                                    // ≥ 500MB → 10MB
}
const DEFAULT_FILE_ID = "1zepiEzfcQJGocNokfozLrzklGQUPo8Kw";

function timestamp() {
  return new Date().toLocaleTimeString("pt-BR");
}

export default function Processador() {
  const [fileId, setFileId] = useState(DEFAULT_FILE_ID);
  const [token, setToken] = useState("");
  const [record, setRecord] = useState(null);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);

  const addLog = (msg, type = "info") => {
    setLogs(prev => [...prev, { msg, type, time: timestamp() }]);
  };

  // Busca ou cria o registro de controle
  const getOrCreateRecord = async () => {
    const existing = await base44.entities.ControleProcessamento.filter({ file_id: fileId });
    if (existing.length > 0) return existing[0];
    const created = await base44.entities.ControleProcessamento.create({
      file_id: fileId,
      last_byte_read: 0,
      chunks_processed: 0,
      status: "pendente",
      log: "",
    });
    return created;
  };

  // Atualiza registro no banco
  const updateRecord = async (id, data) => {
    const updated = await base44.entities.ControleProcessamento.update(id, data);
    setRecord(updated);
    return updated;
  };

  // Processa um chunk — substitua esta função pela sua lógica (OCR, IA, etc.)
  const processChunk = async (chunkText, chunkIndex) => {
    // [DEFINA SUA LÓGICA AQUI — ex: enviar para InvokeLLM, OCR, parser, etc.]
    addLog(`Chunk #${chunkIndex}: ${chunkText.length} bytes recebidos → processamento customizável aqui.`, "success");
  };

  const startProcessing = async () => {
    if (!token) { addLog("Token de acesso é obrigatório.", "error"); return; }

    setRunning(true);
    stopRef.current = false;
    setLogs([]);

    let ctrl;
    try {
      ctrl = await getOrCreateRecord();
      setRecord(ctrl);
      addLog(`Registro encontrado. Retomando do byte ${ctrl.last_byte_read}.`);
    } catch (e) {
      addLog("Erro ao buscar/criar registro: " + e.message, "error");
      setRunning(false);
      return;
    }

    if (ctrl.status === "concluido") {
      addLog("Arquivo já foi completamente processado. Redefina para reprocessar.", "info");
      setRunning(false);
      return;
    }

    ctrl = await updateRecord(ctrl.id, { status: "processando" });

    let lastByte = ctrl.last_byte_read || 0;
    let chunkIndex = ctrl.chunks_processed || 0;
    const endpoint = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    while (!stopRef.current) {
      const chunkSize = getChunkSize(ctrl.file_size);
      const rangeEnd = lastByte + chunkSize - 1;
      addLog(`Solicitando bytes ${lastByte}–${rangeEnd} (Chunk #${chunkIndex + 1}, ${(chunkSize/1024).toFixed(0)}KB)...`);

      let res;
      try {
        res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            Range: `bytes=${lastByte}-${rangeEnd}`,
          },
        });
      } catch (e) {
        addLog("Erro de rede: " + e.message, "error");
        await updateRecord(ctrl.id, { status: "erro" });
        break;
      }

      if (res.status === 416 || res.status === 404) {
        addLog(`Status ${res.status} — fim do arquivo atingido.`, "success");
        await updateRecord(ctrl.id, { status: "concluido", last_byte_read: lastByte });
        break;
      }

      if (res.status !== 206 && res.status !== 200) {
        const err = await res.text();
        addLog(`Erro HTTP ${res.status}: ${err.slice(0, 200)}`, "error");
        await updateRecord(ctrl.id, { status: "erro" });
        break;
      }

      // Captura tamanho total a partir do header Content-Range
      const contentRange = res.headers.get("Content-Range");
      if (contentRange && !ctrl.file_size) {
        const match = contentRange.match(/\/(\d+)$/);
        if (match) {
          const total = parseInt(match[1]);
          ctrl = await updateRecord(ctrl.id, { file_size: total });
          addLog(`Tamanho total do arquivo: ${(total / 1024 / 1024).toFixed(2)} MB`);
        }
      }

      const text = await res.text();
      if (!text) {
        addLog("Resposta vazia — fim do arquivo.", "success");
        await updateRecord(ctrl.id, { status: "concluido", last_byte_read: lastByte });
        break;
      }

      await processChunk(text, chunkIndex + 1);

      lastByte += text.length;
      chunkIndex += 1;

      ctrl = await updateRecord(ctrl.id, {
        last_byte_read: lastByte,
        chunks_processed: chunkIndex,
      });

      // Se o chunk retornou menos que o tamanho esperado, chegou ao fim
      if (text.length < chunkSize) {
        addLog("Último chunk recebido — processamento completo!", "success");
        await updateRecord(ctrl.id, { status: "concluido" });
        break;
      }
    }

    if (stopRef.current) {
      addLog("Processamento pausado pelo usuário.", "info");
      await updateRecord(ctrl.id, { status: "pendente" });
    }

    setRunning(false);
  };

  const stopProcessing = () => {
    stopRef.current = true;
    addLog("Sinal de parada enviado...");
  };

  const resetRecord = async () => {
    if (!record) return;
    const updated = await updateRecord(record.id, {
      last_byte_read: 0,
      chunks_processed: 0,
      status: "pendente",
      log: "",
    });
    setRecord(updated);
    setLogs([]);
    addLog("Registro redefinido. Pronto para reprocessar do início.");
  };

  const deleteRecord = async () => {
    if (!record) return;
    await base44.entities.ControleProcessamento.delete(record.id);
    setRecord(null);
    setLogs([]);
  };

  // Carrega registro ao mudar o file_id
  useEffect(() => {
    base44.entities.ControleProcessamento.filter({ file_id: fileId }).then(res => {
      setRecord(res.length > 0 ? res[0] : null);
    });
  }, [fileId]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Processador de Arquivos Gigantes</h1>
          <p className="text-sm text-gray-500 mt-1">Google Drive API v3 — Range Requests com Checkpointing</p>
        </div>

        {/* Configuração */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>File ID do Google Drive</Label>
              <Input
                value={fileId}
                onChange={e => setFileId(e.target.value)}
                placeholder="Ex: 1zepiEzfcQJGocNokfozLrzklGQUPo8Kw"
                className="font-mono text-sm"
                disabled={running}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Google Access Token (Bearer)</Label>
              <Input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Cole seu token aqui..."
                className="font-mono text-sm"
                disabled={running}
              />
            </div>
            <div className="text-xs text-gray-400 bg-gray-50 rounded-md p-2 font-mono">
              Chunk size: dinâmico (512KB–10MB) baseado no tamanho do arquivo · Range: bytes=N-M
            </div>
          </CardContent>
        </Card>

        {/* Status & Progresso */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Status do Processamento</CardTitle>
              {record && <StatusBadge status={record.status} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {record ? (
              <>
                <ChunkProgressBar
                  lastByte={record.last_byte_read || 0}
                  fileSize={record.file_size || 0}
                />
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Chunks</p>
                    <p className="font-bold text-lg">{record.chunks_processed || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Bytes lidos</p>
                    <p className="font-bold text-lg">{((record.last_byte_read || 0) / 1024).toFixed(0)} KB</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Tamanho total</p>
                    <p className="font-bold text-lg">{record.file_size ? `${(record.file_size / 1024 / 1024).toFixed(1)} MB` : "—"}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Nenhum registro encontrado para este File ID. Um novo será criado ao iniciar.
              </p>
            )}

            <Separator />

            <ProcessorLog entries={logs} />

            {/* Ações */}
            <div className="flex gap-2 flex-wrap">
              {!running ? (
                <Button onClick={startProcessing} className="bg-blue-600 hover:bg-blue-700 flex-1">
                  <Play className="w-4 h-4 mr-2" />
                  {record?.last_byte_read > 0 ? "Retomar Processamento" : "Iniciar Processamento"}
                </Button>
              ) : (
                <Button onClick={stopProcessing} variant="destructive" className="flex-1">
                  <Square className="w-4 h-4 mr-2" />
                  Pausar
                </Button>
              )}
              {record && !running && (
                <>
                  <Button onClick={resetRecord} variant="outline" size="icon" title="Redefinir do início">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button onClick={deleteRecord} variant="outline" size="icon" title="Excluir registro">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}