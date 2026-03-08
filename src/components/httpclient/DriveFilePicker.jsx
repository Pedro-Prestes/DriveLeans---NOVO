import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, Search, FolderOpen, FileText, File, X,
  ChevronRight, Home, Users, Monitor, Clock, Star, Folder
} from "lucide-react";
import FilePreviewModal from "./FilePreviewModal";

const MIME_ICONS = {
  "application/pdf": <FileText className="w-4 h-4 text-red-500" />,
  "application/vnd.google-apps.document": <FileText className="w-4 h-4 text-blue-500" />,
  "application/vnd.google-apps.spreadsheet": <File className="w-4 h-4 text-green-600" />,
  "application/vnd.google-apps.presentation": <FileText className="w-4 h-4 text-orange-400" />,
  "application/vnd.google-apps.folder": <Folder className="w-4 h-4 text-yellow-500" />,
  "default": <File className="w-4 h-4 text-gray-400" />,
};

const SECTIONS = [
  { id: "recent",    label: "Recentes",            icon: <Clock className="w-4 h-4" /> },
  { id: "my-drive",  label: "Meu Drive",            icon: <Home className="w-4 h-4" /> },
  { id: "shared",    label: "Compartilhados comigo",icon: <Users className="w-4 h-4" /> },
  { id: "starred",   label: "Com estrela",           icon: <Star className="w-4 h-4" /> },
  { id: "computers", label: "Computadores",          icon: <Monitor className="w-4 h-4" /> },
];

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatSize(bytes) {
  if (!bytes) return "-";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function buildQuery(section, folderId) {
  if (folderId) return `'${folderId}' in parents and trashed=false`;
  switch (section) {
    case "recent":    return "trashed=false";
    case "my-drive":  return "'root' in parents and trashed=false";
    case "shared":    return "sharedWithMe=true and trashed=false";
    case "starred":   return "starred=true and trashed=false";
    case "computers": return "trashed=false"; // melhor esforço, a API não expõe "Computadores" diretamente
    default:          return "trashed=false";
  }
}

function buildOrderBy(section) {
  return section === "recent" ? "viewedByMeTime desc" : "folder,name";
}

export default function DriveFilePicker({ token, onSelect }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("recent");
  const [folderStack, setFolderStack] = useState([]); // [{id, name}]
  const [loaded, setLoaded] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const prevToken = useRef(null);

  const currentFolder = folderStack[folderStack.length - 1] || null;

  const fetchFiles = async (sec, folderId) => {
    setLoading(true);
    setSearch("");
    const q = encodeURIComponent(buildQuery(sec, folderId));
    const orderBy = buildOrderBy(sec);
    const fields = "files(id,name,mimeType,modifiedTime,size)";
    const pageSize = folderId || sec !== "recent" ? 200 : 50;
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=${encodeURIComponent(orderBy)}&pageSize=${pageSize}`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) {
        console.error("Google Drive API erro:", data.error);
        alert(`Erro da API Google Drive: ${data.error.message}`);
        setFiles([]);
      } else {
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error("Falha ao buscar arquivos:", err);
      alert("Falha ao conectar com Google Drive. Verifique o token.");
      setFiles([]);
    }
    setLoaded(true);
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      prevToken.current = token;
      fetchFiles(section, currentFolder?.id);
    }
  }, [token, section, currentFolder?.id]);

  const handleSectionChange = (sec) => {
    setSection(sec);
    setFolderStack([]);
    setFiles([]);
    setLoaded(false);
  };

  const handleFolderOpen = (file) => {
    setFolderStack((prev) => [...prev, { id: file.id, name: file.name }]);
  };

  const handleBreadcrumb = (index) => {
    setFolderStack((prev) => prev.slice(0, index + 1));
  };

  const handleBack = () => {
    setFolderStack((prev) => prev.slice(0, -1));
  };

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const isFolder = (file) => file.mimeType === "application/vnd.google-apps.folder";

  if (!token) return null;

  return (
    <>
      {/* FIXPOINT: 2026-03-06 - JSX structure corrected: added missing </div> for outer wrapper */}
      {previewFile && (
      <FilePreviewModal
        file={previewFile}
        token={token}
        onConfirm={onSelect}
        onClose={() => setPreviewFile(null)}
      />
    )}
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="flex">
        {/* Sidebar de seções */}
        <div className="w-44 border-r border-gray-100 bg-gray-50 py-3 shrink-0">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Google Drive</p>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSectionChange(s.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${
                section === s.id
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className={section === s.id ? "text-blue-500" : "text-gray-400"}>{s.icon}</span>
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0 p-4 space-y-3">
          {/* Breadcrumb + Atualizar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-sm text-gray-500 flex-wrap">
              <button
                onClick={() => handleSectionChange(section)}
                className="hover:text-blue-600 font-medium text-gray-700"
              >
                {SECTIONS.find((s) => s.id === section)?.label}
              </button>
              {folderStack.map((f, i) => (
                <span key={f.id} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                  <button
                    onClick={() => handleBreadcrumb(i)}
                    className="hover:text-blue-600 max-w-[120px] truncate"
                  >
                    {f.name}
                  </button>
                </span>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchFiles(section, currentFolder?.id)} disabled={loading} className="shrink-0">
              {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              {loaded ? "Atualizar" : "Carregar"}
            </Button>
          </div>

          {/* Pesquisa */}
          {loaded && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <Input
                placeholder="Pesquisar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-sm h-8"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Lista de arquivos */}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : loaded ? (
            <>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-100">
                {filtered.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-6">Nenhum arquivo encontrado.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Nome</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Modificado</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Tamanho</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((file) => (
                        <tr key={file.id} className="border-t border-gray-50 hover:bg-blue-50 transition-colors">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {MIME_ICONS[file.mimeType] || MIME_ICONS["default"]}
                              <span className="truncate max-w-[180px] font-medium text-gray-700">{file.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-400 text-xs hidden sm:table-cell">{formatDate(file.modifiedTime)}</td>
                          <td className="px-3 py-2 text-gray-400 text-xs hidden sm:table-cell">{formatSize(file.size)}</td>
                          <td className="px-3 py-2">
                            {isFolder(file) ? (
                              <Button size="sm" variant="ghost" className="text-yellow-600 hover:text-yellow-700 h-7 px-2 text-xs" onClick={() => handleFolderOpen(file)}>
                                Abrir
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 h-7 px-2 text-xs" onClick={() => setPreviewFile(file)}>
                                Selecionar
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <p className="text-xs text-gray-400">{filtered.length} item(s) exibido(s)</p>
            </>
          ) : (
            <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
              Clique em "Carregar" para ver os arquivos.
            </div>
          )}
        </div>
      </div>
      </div>
      {/* END FIXPOINT: Closes the main container div */}
    </>
  );
}