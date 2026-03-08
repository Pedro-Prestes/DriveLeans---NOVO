import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, Download } from "lucide-react";
import { GoogleDriveService } from "../components/services/GoogleDriveService";

export default function HttpClientTest() {
  const [fileId, setFileId] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleDownloadFile = async () => {
    if (!fileId) {
      alert("Preencha o File ID");
      return;
    }

    setLoading(true);
    setStatus(null);
    setResponse("");

    try {
      const blob = await GoogleDriveService.getFileContent(fileId);
      const text = await blob.text();

      setStatus(200);
      setResponse(
        `Arquivo baixado com sucesso (${(blob.size / 1024).toFixed(2)}KB)\n\n` +
        "CONTEÚDO (primeiros 500 caracteres):\n" +
        text.substring(0, 500) +
        (text.length > 500 ? "\n... (truncado)" : "")
      );
    } catch (error) {
      setResponse(`Erro: ${error.message}`);
      setStatus(500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Google Drive File Downloader</h1>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <Label htmlFor="fileId">File ID do Google Drive</Label>
            <Input
              id="fileId"
              placeholder="Cole o ID do arquivo aqui"
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
            />
          </div>

          <Button
            onClick={handleDownloadFile}
            disabled={!fileId || loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Baixando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Baixar Arquivo (1MB)
              </>
            )}
          </Button>
        </div>

        {status !== null && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className={`text-sm font-semibold ${status === 200 ? "text-green-600" : "text-red-600"}`}>
              Status: {status}
            </div>
            <Textarea
              readOnly
              value={response}
              className="h-64 font-mono text-xs bg-gray-50"
            />
          </div>
        )}
      </div>
    </div>
  );
}