import React, { useState, useRef, useEffect } from 'react';
import { GoogleDriveService } from '../../components/services/GoogleDriveService';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Zap, X } from 'lucide-react';

const BunkerEmergencia = ({ fileId, token, totalSize, onClose }) => {
  const [progresso, setProgresso] = useState(0);
  const [status, setStatus] = useState('AGUARDANDO COMANDO...');
  const [atacando, setAtacando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const fatiasRef = useRef([]);

  const executarAtaque = async () => {
    setAtacando(true);
    fatiasRef.current = [];
    setProgresso(0);
    setStatus('INICIANDO OPERAÇÃO KAMIKAZE...');
    setResultado(null);

    try {
      // Chamada ao motor de alta performance
      await GoogleDriveService.missaoAltaPerformance(
        fileId,
        token,
        totalSize,
        (progData) => {
          setProgresso(progData.percentual);
          setStatus(`MORDIDA: ${progData.percentual}% - BYTES EM MOVIMENTO (${progData.fatiasCompletas}/${progData.totalFatias})`);

          if (progData.blob) {
            fatiasRef.current.push(progData.blob);
          }
        }
      );

      setStatus('✅ SUCESSO! DISPARANDO A+B...');
      await executarFinalizacaoDireta(fatiasRef.current);

    } catch (err) {
      setStatus('❌ ERRO NA TRINCHEIRA: ' + err.message);
    } finally {
      setAtacando(false);
    }
  };

  const executarFinalizacaoDireta = async (chunks) => {
    const blob = new Blob(chunks, { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    // --- ITEM A: DOWNLOAD FORÇADO ---
    const a = document.createElement('a');
    a.href = url;
    a.download = `ARQUIVO_DE_GUERRA_${Date.now()}.bin`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setStatus('💾 ITEM A: DOWNLOAD DISPARADO');

    // --- ITEM B: ANÁLISE E VISUALIZAÇÃO ---
    try {
      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt: `Arquivo binário crítico recebido. Análise urgente solicitada. Forneça resumo técnico e dados de identificação.`,
        file_urls: [blob],
        response_json_schema: {
          type: 'object',
          properties: {
            status_critico: { type: 'string' },
            tipo_detectado: { type: 'string' },
            tamanho_confirmado: { type: 'number' },
            timestamp: { type: 'string' },
          },
        },
      });

      setResultado(resultado);
      setStatus('✅ ITEM B: IA PROCESSOU - MISSÃO CUMPRIDA');
      console.log('🎖️ Resultado da IA:', resultado);
    } catch (iaErr) {
      setResultado({ erro: 'IA indisponível', mensagem: iaErr.message });
      setStatus('⚠️ ITEM B: IA OFFLINE - MAS ARQUIVO SALVOU!');
    }

    // Mostrar preview se for imagem
    if (chunks[0]?.type?.includes('image')) {
      const imgUrl = URL.createObjectURL(blob);
      setResultado((prev) => ({ ...prev, preview: imgUrl }));
    }
  };

  return (
    <div className="fixed top-5 right-5 w-96 z-[9999] font-mono text-sm shadow-2xl border-2 border-red-600 bg-black p-4 space-y-3 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
          <span className="text-red-500 font-bold">⚠️ BUNKER DE EMERGÊNCIA</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-red-500 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Status */}
      <div className="bg-gray-900 p-2 border border-gray-700 rounded text-green-400 min-h-12 flex items-center">
        {status}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full h-3 bg-gray-800 border border-red-900 rounded overflow-hidden">
          <div
            className="h-full bg-red-600 shadow-[0_0_10px_#dc2626] transition-all duration-300"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <div className="text-right text-red-400 text-xs">{progresso}%</div>
      </div>

      {/* Attack Button */}
      <button
        onClick={executarAtaque}
        disabled={atacando}
        className="w-full py-3 bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold uppercase border border-red-500 rounded transition-all shadow-[0_0_8px_#dc2626] active:scale-95"
      >
        {atacando ? '⚙️ MORRENDO ATIRANDO...' : '🚀 EXECUTAR ATAQUE (A+B)'}
      </button>

      {/* Resultado */}
      {resultado && (
        <div className="bg-green-900/20 border border-green-600 rounded p-3 space-y-2">
          <div className="text-green-400 font-bold">✅ RESULTADO ITEM B:</div>
          <div className="text-xs text-gray-300 space-y-1">
            {Object.entries(resultado).map(([key, value]) => (
              <div key={key}>
                <span className="text-green-500">{key}:</span> {String(value).substring(0, 40)}...
              </div>
            ))}
          </div>

          {resultado.preview && (
            <img
              src={resultado.preview}
              alt="Preview"
              className="w-full h-32 object-cover rounded border border-green-600 mt-2"
            />
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="text-xs text-gray-500 border-t border-gray-700 pt-2">
        🎖️ Operação Kamikaze • Download (A) + IA (B) • ZIndex: 9999
      </div>
    </div>
  );
};

export default BunkerEmergencia;