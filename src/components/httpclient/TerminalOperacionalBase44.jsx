import React, { useState, useEffect } from 'react';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { base44 } from '@/api/base44Client';
import { Activity, Download, Zap } from 'lucide-react';

const TerminalOperacionalBase44 = ({ fileId, token, totalSize, nomeArquivo }) => {
  const [fatias, setFatias] = useState([]);
  const [progresso, setProgresso] = useState(0);
  const [finalizado, setFinalizado] = useState(false);
  const [status, setStatus] = useState('Aguardando Ativação...');
  const [processandoIA, setProcessandoIA] = useState(false);

  // 🛡️ RECONSTRUTOR E DISPARADOR
  useEffect(() => {
    if (progresso === 100 && !finalizado) {
      executarProtocoloFinal();
    }
  }, [progresso, finalizado]);

  const lancarMissao = async () => {
    setStatus('Iniciando Extração...');
    setFatias([]);
    setProgresso(0);
    setFinalizado(false);

    try {
      await GoogleDriveService.missaoAltaPerformance(
        fileId,
        token,
        totalSize,
        (progData) => {
          setProgresso(progData.percentual);
          setStatus(`Capturando: ${progData.fatiasCompletas}/${progData.totalFatias} fatias`);

          if (progData.blob) {
            setFatias((prev) => [...prev, progData.blob]);
          }
        }
      );
    } catch (err) {
      setStatus('❌ FALHA NA EXTRAÇÃO: ' + err.message);
    }
  };

  const executarProtocoloFinal = async () => {
    setFinalizado(true);
    const blobFinal = new Blob(fatias, { type: 'application/octet-stream' });

    // --- ITEM A: DOWNLOAD AUTOMÁTICO ---
    setStatus('💾 Protocolo A: Disparando Download...');
    try {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blobFinal);
      link.download = nomeArquivo || `extracao_${fileId}.bin`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatus('✅ Download Iniciado');
    } catch (err) {
      console.error('Erro no download:', err);
    }

    // --- ITEM B: PONTE BASE44 / IA ---
    setStatus('🧠 Protocolo B: Injetando na IA do Base44...');
    setProcessandoIA(true);

    try {
      await enviarParaProcessamentoIA(blobFinal);
      setStatus('✅ IA Processando com Sucesso! Operação Concluída.');
    } catch (err) {
      console.error('Falha na Injeção de IA:', err);
      setStatus('⚠️ Download concluído, mas IA indisponível.');
    } finally {
      setProcessandoIA(false);
    }
  };

  const enviarParaProcessamentoIA = async (blob) => {
    // Converter blob para base64 para envio
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          // Usar integração de IA do Base44
          const resultado = await base44.integrations.Core.InvokeLLM({
            prompt: `Você recebeu um arquivo binário extraído. Analise seu conteúdo e forneça um resumo estruturado sobre o que foi processado. Nome do arquivo: ${nomeArquivo || 'desconhecido'}.`,
            file_urls: [blob], // Se for imagem/pdf
            response_json_schema: {
              type: 'object',
              properties: {
                tipo_arquivo: { type: 'string' },
                resumo: { type: 'string' },
                metadados_detectados: { type: 'object' },
              },
            },
          });

          console.log('✅ Resposta da IA:', resultado);
          resolve(resultado);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(blob);
    });
  };

  return (
    <div className="p-4 border-2 border-blue-600 bg-gray-950 rounded-md shadow-2xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
          <span className="text-blue-400 font-bold tracking-widest text-xs">STATUS DA MISSÃO: {progresso}%</span>
        </div>
        {finalizado && (
          <span className="text-green-500 animate-pulse text-xs flex items-center gap-1">
            ● OPERAÇÃO CONCLUÍDA
          </span>
        )}
      </div>

      {/* Barra de Progresso Tática */}
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-700 to-blue-400 transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
          style={{ width: `${progresso}%` }}
        />
      </div>

      {/* Status Log */}
      <div className="flex gap-2 items-start">
        <Zap className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-[11px] text-gray-400 font-mono break-words">
          [LOG]: {status}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        {progresso === 0 && !finalizado && (
          <button
            onClick={lancarMissao}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase rounded transition-all border border-blue-400 flex items-center justify-center gap-1"
          >
            <Zap className="w-3 h-3" />
            Lançar Missão
          </button>
        )}

        {finalizado && (
          <button
            onClick={lancarMissao}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase rounded transition-all border border-blue-400 flex items-center justify-center gap-1"
          >
            <Zap className="w-3 h-3" />
            Nova Missão
          </button>
        )}

        {finalizado && (
          <button
            disabled={processandoIA}
            className="flex-1 px-3 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold text-xs uppercase rounded transition-all border border-green-500 flex items-center justify-center gap-1"
          >
            <Download className="w-3 h-3" />
            Arquivo Baixado
          </button>
        )}
      </div>

      {/* IA Processing Indicator */}
      {processandoIA && (
        <div className="text-[10px] text-yellow-500 font-mono animate-pulse">
          ⏳ Aguardando análise da IA...
        </div>
      )}
    </div>
  );
};

export default TerminalOperacionalBase44;