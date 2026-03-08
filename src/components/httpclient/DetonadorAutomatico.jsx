import React, { useState, useEffect, useRef } from 'react';
import { GoogleDriveService } from '../../components/services/GoogleDriveService';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Zap } from 'lucide-react';

const DetonadorAutomatico = ({ fileId: propFileId, token: propToken, totalSize: propTotalSize, onDetonacaoConcluida }) => {
  const [status, setStatus] = useState('RECONHECENDO TERRENO...');
  const [progresso, setProgresso] = useState(0);
  const [detonado, setDetonado] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    // Auto-iniciar detonação ao montar
    detonarAgora();
  }, []);

  const detonarAgora = async () => {
    try {
      setStatus('RECONHECENDO TERRENO...');
      setErro(null);

      // 1. BUSCA DE MUNIÇÃO (DADOS)
      const FILE_ID = propFileId || window.FILE_ID || localStorage.getItem('lastFileId');
      const TOKEN = propToken || window.ACCESS_TOKEN || localStorage.getItem('lastToken');
      const TOTAL_SIZE = propTotalSize || window.TOTAL_SIZE || 10485760;

      if (!FILE_ID || !TOKEN) {
        setErro('CHAVE NÃO ENCONTRADA. RECUAR!');
        setStatus('❌ ERRO: MUNIÇÃO INSUFICIENTE');
        return;
      }

      console.log('%c🚀 [SISTEMA]: DETONADOR ARMADO. AGUARDANDO ESTABILIZAÇÃO...', 'color: red; font-weight: bold; font-size: 16px;');

      setStatus('🎯 ALVO TRAVADO. INICIANDO MORDIDAS...');
      chunksRef.current = [];

      // 2. O ATAQUE (ITENS 1 E 3 - MULTI-THREAD RESILIENTE)
      await GoogleDriveService.missaoAltaPerformance(
        FILE_ID,
        TOKEN,
        TOTAL_SIZE,
        (progData) => {
          setProgresso(progData.percentual);
          setStatus(`EXTRAINDO BITS: ${progData.percentual}% (${progData.fatiasCompletas}/${progData.totalFatias})`);

          if (progData.blob) {
            chunksRef.current.push(progData.blob);
          }
        }
      );

      // 3. A DETONAÇÃO FINAL (ITENS A + B)
      setStatus('💥 FINALIZANDO: A + B EM CURSO...');
      await executarDetonacaoFinal(FILE_ID, TOKEN);
      setDetonado(true);

    } catch (err) {
      console.error('💀 SISTEMA CAIU:', err);
      setErro(err.message);
      setStatus('💀 SISTEMA CAIU: ' + err.message);
    }
  };

  const executarDetonacaoFinal = async (fileId, token) => {
    // A - DOWNLOAD FANTASMA
    setStatus('💾 ITEM A: DOWNLOAD FANTASMA...');
    const blobFinal = new Blob(chunksRef.current, { type: 'application/octet-stream' });
    const urlFinal = URL.createObjectURL(blobFinal);

    const dLink = document.createElement('a');
    dLink.href = urlFinal;
    dLink.download = `MISSAO_CUMPRIDA_${Date.now()}.bin`;
    document.body.appendChild(dLink);
    dLink.click();
    document.body.removeChild(dLink);

    console.log('💾 Item A: Download disparado!');

    // B - INJEÇÃO DE IA + VISUALIZAÇÃO
    setStatus('🧠 ITEM B: INJEÇÃO NA IA...');
    try {
      const resultadoIA = await base44.integrations.Core.InvokeLLM({
        prompt: `Sistema crítico de extração ativado. Arquivo binário recebido. Análise de dados e identificação solicitados urgentemente. FileID: ${fileId}`,
        file_urls: [blobFinal],
        response_json_schema: {
          type: 'object',
          properties: {
            status_sistema: { type: 'string' },
            tipo_arquivo_detectado: { type: 'string' },
            tamanho_confirmado: { type: 'number' },
            timestamp_extracao: { type: 'string' },
            recomendacoes: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      setResultado({
        ia: resultadoIA,
        blobUrl: urlFinal,
        tamanho: blobFinal.size,
        chunks: chunksRef.current.length,
      });

      setStatus('🏁 VITÓRIA! ARQUIVO CAPTURADO E SALVO.');
      console.log('✅ [QG]: VITÓRIA! Resultado:', resultadoIA);

      if (onDetonacaoConcluida) {
        onDetonacaoConcluida({
          blob: blobFinal,
          resultado: resultadoIA,
          chunks: chunksRef.current.length,
        });
      }
    } catch (iaErr) {
      console.warn('⚠️ IA offline, mas arquivo salvou:', iaErr);
      setStatus('⚠️ ITEM B: IA OFFLINE - MAS ARQUIVO SALVOU!');
      setResultado({
        blobUrl: urlFinal,
        tamanho: blobFinal.size,
        chunks: chunksRef.current.length,
        aviso: 'IA indisponível',
      });
    }
  };

  return (
    <div className="fixed top-3 left-3 z-[10000] w-96 bg-black border-2 border-red-600 p-4 rounded-lg font-mono text-sm shadow-[0_0_20px_rgba(255,0,0,0.5)] space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-red-500 font-bold animate-pulse">
        <AlertTriangle className="w-5 h-5" />
        <span>☢️ EXECUÇÃO AUTOMÁTICA EM CURSO ☢️</span>
      </div>

      {/* Status Log */}
      <div className="bg-gray-900 border border-gray-700 p-2 rounded min-h-8 text-green-400">
        {status}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full h-2 bg-gray-800 border border-red-900 rounded overflow-hidden">
          <div
            className="h-full bg-red-600 shadow-[0_0_8px_#dc2626] transition-all duration-300"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <div className="text-right text-red-400 text-xs">{progresso}%</div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="bg-red-900/30 border border-red-600 p-2 rounded text-red-300 text-xs">
          {erro}
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="bg-green-900/20 border border-green-600 rounded p-3 space-y-2 max-h-64 overflow-y-auto">
          <div className="text-green-400 font-bold">✅ DETONAÇÃO COMPLETA</div>
          
          <div className="text-xs text-gray-300 space-y-1">
            <div>📦 Chunks: {resultado.chunks}</div>
            <div>💾 Tamanho: {(resultado.tamanho / 1024 / 1024).toFixed(2)}MB</div>
            {resultado.ia && (
              <>
                <div className="border-t border-green-700 pt-1 mt-1">
                  {Object.entries(resultado.ia).map(([key, value]) => (
                    <div key={key} className="text-green-400">
                      <span className="text-green-300">{key}:</span> {String(value).substring(0, 35)}...
                    </div>
                  ))}
                </div>
              </>
            )}
            {resultado.aviso && <div className="text-yellow-400">⚠️ {resultado.aviso}</div>}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-700 pt-2 text-gray-500 text-xs flex items-center gap-1">
        <Zap className="w-3 h-3" />
        Detonador Automático • Z-Index: 10000
      </div>
    </div>
  );
};

export default DetonadorAutomatico;