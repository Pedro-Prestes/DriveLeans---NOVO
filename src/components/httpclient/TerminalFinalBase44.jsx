import React, { useState, useEffect } from 'react';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { base44 } from '@/api/base44Client';
import { Zap } from 'lucide-react';

const TerminalFinalBase44 = ({ fileId, token, totalSize, nomeArquivo, onMissaoConcluida }) => {
  const [fatias, setFatias] = useState([]);
  const [progresso, setProgresso] = useState(0);
  const [statusMissao, setStatusMissao] = useState('OPERACIONAL');
  const [emProcessamento, setEmProcessamento] = useState(false);

  // 🛡️ MONITOR DE CONCLUSÃO (ITENS A E B)
  useEffect(() => {
    if (progresso === 100 && fatias.length > 0 && !emProcessamento) {
      finalizarEProcessar();
    }
  }, [progresso, fatias, emProcessamento]);

  const lancarCaptura = async () => {
    setStatusMissao('CAPTURANDO...');
    setProgresso(0);
    setFatias([]);

    try {
      await GoogleDriveService.missaoAltaPerformance(
        fileId,
        token,
        totalSize,
        (progData) => {
          setProgresso(progData.percentual);

          if (progData.blob) {
            setFatias((prev) => [...prev, progData.blob]);
          }
        }
      );
    } catch (err) {
      setStatusMissao('❌ FALHA NA CAPTURA: ' + err.message);
    }
  };

  const finalizarEProcessar = async () => {
    setEmProcessamento(true);
    setStatusMissao('PROCESSANDO A + B...');

    try {
      // 1. RECONSTRUÇÃO DO BINÁRIO INTEGRAL
      const blobFinal = new Blob(fatias, { type: 'application/octet-stream' });

      // --- ITEM A: DOWNLOAD AUTOMÁTICO (EXTRAÇÃO FANTASMA) ---
      const url = URL.createObjectURL(blobFinal);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo || `base44_extracao_${Date.now()}.bin`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('💾 Item A: Arquivo salvo no disco do Operador.');

      // --- ITEM B: INJEÇÃO NA IA DO BASE44 ---
      try {
        await enviarParaIA(blobFinal, nomeArquivo);
        setStatusMissao('✅ VITÓRIA TOTAL: SALVO E ANALISADO');
      } catch (iaErr) {
        console.warn('⚠️ IA indisponível:', iaErr);
        setStatusMissao('⚠️ ARQUIVO SALVO, MAS IA FORA DE SINAL');
      }

      // Callback opcional para pai
      if (onMissaoConcluida) {
        onMissaoConcluida({
          blob: blobFinal,
          nomeArquivo: nomeArquivo || `base44_extracao_${Date.now()}.bin`,
          totalFatias: fatias.length,
        });
      }
    } catch (err) {
      setStatusMissao('❌ ERRO NA FINALIZAÇÃO: ' + err.message);
    } finally {
      setEmProcessamento(false);
    }
  };

  const enviarParaIA = async (blob, nome) => {
    try {
      // Usar integração IA do Base44
      await base44.integrations.Core.InvokeLLM({
        prompt: `Você recebeu um arquivo binário extraído do Google Drive. Analise seu conteúdo e forneça um resumo. Nome: ${nome || 'desconhecido'}.`,
        file_urls: [blob],
        response_json_schema: {
          type: 'object',
          properties: {
            tipo_arquivo: { type: 'string' },
            analise: { type: 'string' },
          },
        },
      });

      console.log('✅ IA processou com sucesso!');
    } catch (err) {
      throw new Error('IA indisponível: ' + err.message);
    }
  };

  return (
    <div className="p-4 bg-slate-950 border-l-4 border-blue-600 rounded space-y-3">
      {/* Status Header */}
      <div className="flex justify-between text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-blue-500 animate-pulse" />
          <span className="text-blue-500">{statusMissao}</span>
        </div>
        <span className="text-blue-300">{progresso}%</span>
      </div>

      {/* HUD de Progresso */}
      <div className="w-full h-1 bg-gray-800 rounded overflow-hidden">
        <div
          className="h-full bg-blue-500 shadow-[0_0_8px_#3b82f6] transition-all duration-700"
          style={{ width: `${progresso}%` }}
        />
      </div>

      {/* Metadata */}
      {fatias.length > 0 && (
        <div className="text-[9px] text-gray-500 font-mono">
          Fatias: {fatias.length} | Status: {emProcessamento ? 'Processando...' : 'Pronto'}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={lancarCaptura}
        disabled={progresso > 0 && progresso < 100}
        className="w-full text-[10px] border border-blue-900 px-3 py-2 hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed text-blue-200 uppercase font-bold transition-all"
      >
        {progresso === 0 ? '🚀 Lançar Captura' : progresso === 100 ? '🔄 Nova Captura' : '⏳ Capturando...'}
      </button>
    </div>
  );
};

export default TerminalFinalBase44;