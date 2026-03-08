import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, Play, Copy, CheckCircle, FileDown, FileText, Eye, ShieldCheck, AlertTriangle, Download } from "lucide-react";
import jsPDF from "jspdf";
import * as pdfjsLib from "pdfjs-dist";
import { base44 } from "@/api/base44Client";
import { GoogleDriveChunkService } from "@/components/services/GoogleDriveChunkService";
import { GoogleDriveService } from "@/components/services/GoogleDriveService";
import DriveFilePicker from "@/components/httpclient/DriveFilePicker";


pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

async function extractTextFromPDF(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += `--- Página ${i} ---\n${pageText}\n\n`;
  }
  return { text: fullText, numPages: pdf.numPages };
}

export default function HttpClient() {
  const [fileId, setFileId] = useState("1zepiEzfcQJGocNokfozLrzklGQUPo8Kw");
  const [response, setResponse] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPdf, setIsPdf] = useState(false);
  const [fileType, setFileType] = useState("");
  const [pageCount, setPageCount] = useState(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadTotal, setDownloadTotal] = useState(0);
  const [integrityHash, setIntegrityHash] = useState(null);
  const [integrityOk, setIntegrityOk] = useState(null);
  const [token, setToken] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [useChunkService, setUseChunkService] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState(null);

  const getToken = async () => {
    setTokenLoading(true);
    try {
      const res = await base44.functions.invoke('googleToken', {});
      const newToken = res.data.access_token;
      setToken(newToken);
      return newToken;
    } finally {
      setTokenLoading(false);
    }
  };

  const handleRequest = async () => {
    setLoading(true);
    setResponse(null);
    setStatus(null);
    setIsPdf(false);
    setFileType("");
    setPageCount(null);
    setDownloadProgress(0);
    setDownloadTotal(0);
    setIntegrityHash(null);
    setIntegrityOk(null);
    if (pdfObjectUrl) { URL.revokeObjectURL(pdfObjectUrl); setPdfObjectUrl(null); }

    if (!fileId) {
      setStatus(400);
      setLoading(false);
      alert("Por favor, forneça um File ID.");
      return;
    }

    try {
      const activeToken = token || await getToken();
      const result = await GoogleDriveChunkService.executarMissaoCompleta(
        fileId,
        activeToken,
        (progress) => {
          setDownloadProgress(progress.percentual);
          setDownloadTotal(progress.totalBytes);
        }
      );

      setStatus(200);
      setIntegrityOk(true);
      setResponse(result.content);
      setFileType(result.fileType);
      setIntegrityHash(result.integrityHash);
      setIsPdf(result.isPdf);
      setPageCount(result.pageCount);
      
      // Criar object URL para PDF
      if (result.isPdf && result.blob) {
        const url = URL.createObjectURL(result.blob);
        setPdfObjectUrl(url);
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      setStatus(400);
      alert("Erro: " + (error.message || "Falha ao processar arquivo"));
    } finally {
      setLoading(false);
    }
  };

  function isPDFBuffer(buffer) {
    const bytes = new Uint8Array(buffer.slice(0, 5));
    const header = String.fromCharCode(...bytes);
    return header === "%PDF-";
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(response || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const maxWidth = pageWidth - margin * 2;

    doc.setFontSize(14);
    doc.text(`Google Drive File: ${fileId}`, margin, 16);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Status HTTP: ${status} · Gerado em: ${new Date().toLocaleString("pt-BR")}`, margin, 23);
    doc.setTextColor(0);
    doc.setFontSize(10);

    const lines = doc.splitTextToSize(response || "", maxWidth);
    doc.text(lines, margin, 33);

    doc.save(`drive-file-${fileId}.pdf`);
  };

  const isSuccess = status && status >= 200 && status < 300;

  const handleSelectFile = (file) => {
    setFileId(file.id);
    setSelectedFileName(file.name);
    setShowDrivePicker(false);
  };

  const handleDownloadFile = async () => {
    if (!fileId) {
      alert("Por favor, selecione um arquivo.");
      return;
    }

    try {
      setLoading(true);
      const activeToken = token || await getToken();
      const result = await GoogleDriveChunkService.executarMissaoCompleta(
        fileId,
        activeToken,
        (progress) => {
          setDownloadProgress(progress.percentual);
          setDownloadTotal(progress.totalBytes);
        }
      );

      // Download do arquivo original
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedFileName || `arquivo`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert("✅ Arquivo baixado com sucesso!");
    } catch (error) {
      alert("Erro ao baixar: " + (error.message || "Falha na requisição"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HTTP Client</h1>
          <p className="text-sm text-gray-500 mt-1">Google Drive File Processor</p>
        </div>

        {/* Request Config */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Processamento de Arquivo</h2>

          <div className="space-y-1.5">
            <Label>Autenticação Google Drive</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={getToken}
                disabled={tokenLoading}
                className="shrink-0"
              >
                {tokenLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {token ? "🔄 Renovar Token" : "🔑 Conectar Google Drive"}
              </Button>
              {token && <span className="text-xs text-green-600 font-medium">✅ Conectado</span>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fileId">Selecione um arquivo do Google Drive</Label>
            <div className="flex gap-2 items-center">
              <div className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm">
                {selectedFileName ? (
                  <span className="text-gray-900">{selectedFileName}</span>
                ) : (
                  <span className="text-gray-500">Nenhum arquivo selecionado</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDrivePicker(!showDrivePicker)}
                disabled={!token && !tokenLoading}
                className="shrink-0"
              >
                {showDrivePicker ? "Fechar" : "Procurar"}
              </Button>
            </div>
          </div>



          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleDownloadFile}
              disabled={!fileId || loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Baixando...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Baixar Arquivo</>
              )}
            </Button>
            <Button
              onClick={handleRequest}
              disabled={!fileId || loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Processar</>
              )}
            </Button>
          </div>
        </div>

        {/* Google Drive File Picker */}
        {showDrivePicker && (
          <DriveFilePicker
            token={token}
            onSelect={handleSelectFile}
          />
        )}

        {/* Response */}
        {(status !== null || loading) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-800">Resposta</h2>
                {fileType && (
                  <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {fileType}{isPdf && pageCount ? ` · ${pageCount} ${pageCount === 1 ? "página" : "páginas"}` : ""}
                  </Badge>
                )}
              </div>
              {status !== null && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={isSuccess ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {isSuccess ? <CheckCircle className="w-3 h-3 mr-1" /> : null}
                    Status {status}
                  </Badge>
                  {integrityOk === true && (
                    <Badge className="bg-green-100 text-green-800 flex items-center gap-1" title={`SHA-256: ${integrityHash}`}>
                      <ShieldCheck className="w-3 h-3" /> Integridade OK
                    </Badge>
                  )}
                  {integrityOk === false && (
                    <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Falha de integridade
                    </Badge>
                  )}
                  {response && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleCopy}>
                        {copied ? <CheckCircle className="w-3 h-3 mr-1 text-green-600" /> : <Copy className="w-3 h-3 mr-1" />}
                        {copied ? "Copiado!" : "Copiar"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                        <FileDown className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {integrityHash && (
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs font-mono text-gray-400 break-all">
                <span className="text-gray-500 font-sans font-medium">SHA-256: </span>{integrityHash}
              </div>
            )}

            {loading ? (
               <div className="flex items-center justify-center py-10 text-gray-400">
                 <Loader2 className="w-5 h-5 animate-spin mr-2" />
                 Processando arquivo...
               </div>
             ) : isPdf && pdfObjectUrl ? (
              <Tabs defaultValue="preview">
                <TabsList className="mb-3">
                  <TabsTrigger value="preview" className="text-xs flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Prévia
                  </TabsTrigger>
                  <TabsTrigger value="text" className="text-xs flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Texto Extraído
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="preview">
                  <iframe
                    src={pdfObjectUrl}
                    title="PDF Preview"
                    className="w-full h-[500px] rounded-lg border border-gray-200"
                  />
                </TabsContent>
                <TabsContent value="text">
                  <Textarea
                    readOnly
                    value={response || ""}
                    className="font-mono text-xs h-72 bg-gray-50 resize-none"
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <Textarea
                readOnly
                value={response || ""}
                className="font-mono text-xs h-72 bg-gray-50 resize-none"
              />
            )}
          </div>
        )}


      </div>
    </div>
  );
}