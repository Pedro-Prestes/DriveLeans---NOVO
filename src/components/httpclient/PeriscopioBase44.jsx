import React, { useState, useEffect } from 'react';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { Eye } from 'lucide-react';

const PeriscopioBase44 = ({ fileId, token, totalSize }) => {
  const [fatias, setFatias] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [progresso, setProgresso] = useState(0);
  const [emMissao, setEmMissao] = useState(false);
  const [status, setStatus] = useState('Aguardando comando...');

  // 🛡️ RECONSTRUTOR VISUAL: Roda toda vez que uma nova fatia chega
  useEffect(() => {
    if (fatias.length > 0) {
      // Tenta detectar o tipo mime baseado na primeira fatia
      const tipo = fatias[0]?.type || 'image/jpeg';
      const blobCompleto = new Blob(fatias, { type: tipo });
      const url = URL.createObjectURL(blobCompleto);
      setPreviewUrl(url);

      // Limpeza de memória para não "cansar" o browser
      return () => {
        if (url) URL.revokeObjectURL(url);
      };
    }
  }, [fatias]);

  const lancarCaptura = async () => {
    setEmMissao(true);
    setFatias([]);
    setProgresso(0);
    setStatus('Conectando ao Drive...');

    try {
      await GoogleDriveService.missaoAltaPerformance(
        fileId,
        token,
        totalSize,
        (progData) => {
          // Atualiza progresso
          setProgresso(progData.percentual);
          setStatus(`Capturando fatia #${progData.fatiasCompletas}/${progData.totalFatias}`);

          // Se temos a fatia blob (quando disponível)
          if (progData.blob) {
            setFatias((prev) => [...prev, progData.blob]);
          }
        }
      );

      setStatus('✅ MISSÃO CUMPRIDA! Arquivo Reconstruído.';
    } catch (err) {
      setStatus('❌ Conexão Perdida: ' + err.message);
      console.error('🚨 Queda no sinal!', err);
    } finally {
      setEmMissao(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-black border-2 border-green-900 rounded-xl shadow-[0_0_20px_rgba(0,255,0,0.1)]">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-green-900 pb-2">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-green-500 animate-pulse" />
          <h2 className="text-green-500 font-mono tracking-tighter uppercase text-sm">
            Periscópio Base44: Operação Olho Mágico
          </h2>
        </div>
        <span className="text-green-500 font-mono text-sm">{progresso}%</span>
      </div>

      {/* Preview Area - O Olho Mágico */}
      <div className="relative w-full h-64 bg-slate-950 rounded overflow-hidden flex items-center justify-center border border-dashed border-green-800">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview de Campo"
            className="object-contain w-full h-full opacity-80 hover:opacity-100 transition-opacity"
          />
        ) : (
          <div className="text-green-900 font-mono text-xs animate-pulse">
            ▓▒░ Aguardando sinal do Google Drive...
          </div>
        )}

        {/* HUD Progress Bar Overlay */}
        <div className="absolute bottom-0 left-0 h-1 bg-green-500 shadow-[0_0_10px_#00ff00] transition-all duration-300" style={{ width: `${progresso}%` }} />

        {/* Status Corner */}
        {emMissao && (
          <div className="absolute top-2 right-2 text-green-400 font-mono text-xs bg-black/70 px-2 py-1 border border-green-600 rounded">
            REC ◄
          </div>
        )}
      </div>

      {/* Status Line */}
      <div className="text-green-500 font-mono text-xs border-l-2 border-green-700 pl-2">
        {status}
      </div>

      {/* Action Button */}
      <button
        onClick={lancarCaptura}
        disabled={emMissao}
        className="w-full py-3 bg-green-900 text-green-100 font-bold border border-green-500 hover:bg-green-800 active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest text-sm hover:shadow-[0_0_10px_rgba(0,255,0,0.3)]"
      >
        {emMissao ? '⚙️ Extraindo Bits...' : '🎯 Confirmar e Ingerir'}
      </button>

      {/* Stats Line */}
      <div className="text-green-700 font-mono text-xs">
        Fatias Capturadas: {fatias.length} | Taxa: {(totalSize / (1024 * 1024)).toFixed(2)}MB
      </div>
    </div>
  );
};

export default PeriscopioBase44;