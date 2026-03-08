import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X, CheckCircle, FileText, File } from "lucide-react";

const GOOGLE_EXPORT_MIMES = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
  "application/vnd.google-apps.presentation": "text/plain",
};

const IMAGE_MIMES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

export default function FilePreviewModal({ file, token, onConfirm, onClose }) {
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [previewType, setPreviewType] = useState(null); // "pdf" | "image" | "text" | "unsupported"

  useEffect(() => {
    if (!file || !token) return;
    loadPreview();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [file?.id]);

  const loadPreview = async () => {
    setLoading(true);
    setPreviewUrl(null);
    setTextContent(null);

    const exportMime = GOOGLE_EXPORT_MIMES[file.mimeType];

    if (exportMime) {
      // Google Workspace → export como texto
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportMime)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const text = await res.text();
      setTextContent(text.slice(0, 3000) + (text.length > 3000 ? "\n\n[... conteúdo truncado para prévia ...]" : ""));
      setPreviewType("text");
    } else if (file.mimeType === "application/pdf") {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewType("pdf");
    } else if (IMAGE_MIMES.includes(file.mimeType)) {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewType("image");
    } else {
      // Tenta como texto simples (txt, csv, json, xml…)
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 0) {
          setTextContent(text.slice(0, 3000) + (text.length > 3000 ? "\n\n[... conteúdo truncado para prévia ...]" : ""));
          setPreviewType("text");
        } else {
          setPreviewType("unsupported");
        }
      } else {
        setPreviewType("unsupported");
      }
    }

    setLoading(false);
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="font-semibold text-gray-800 truncate">{file.name}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando prévia...
            </div>
          ) : previewType === "pdf" ? (
            <iframe src={previewUrl} title="PDF Preview" className="w-full h-[500px] rounded-lg border border-gray-200" />
          ) : previewType === "image" ? (
            <img src={previewUrl} alt={file.name} className="max-w-full max-h-[500px] mx-auto rounded-lg border border-gray-200 object-contain" />
          ) : previewType === "text" ? (
            <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 border border-gray-100 leading-relaxed overflow-auto max-h-[500px]">
              {textContent}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
              <File className="w-12 h-12 text-gray-300" />
              <p className="text-sm">Prévia não disponível para este tipo de arquivo.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { onConfirm(file); onClose(); }}>
            <CheckCircle className="w-4 h-4 mr-2" /> Confirmar seleção
          </Button>
        </div>
      </div>
    </div>
  );
}