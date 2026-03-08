import React, { useState, useEffect, useRef } from 'react';
import { GoogleDriveService } from '../../components/services/GoogleDriveService';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

const OperacaoVampiro = ({ onTokenCapturado, onMissaoConcluida }) => {
  const [ativo, setAtivo] = useState(false);
  const [status, setStatus] = useState('ESCUTANDO SINAL DA TRINCHEIRA...');
  const [progresso, setProgresso] = useState(0);
  const [tokenCapturado, setTokenCapturado] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [visivel, setVisivel] = useState(false);
  const originalFetchRef = useRef(null);
  const missaoIniciadaRef = useRef(false);
  const chunksRef = useRef([]);

  useEffect(() => {
    // Ativar interceptor ao montar
    ativarInterceptor();

    return () => {
      // Desativar ao desmontar
      desativarInterceptor();
    };
  }, []);

  const ativarInterceptor = () => {
    if (originalFetchRef.current) return; // Já ativado

    originalFetchRef.current = window.fetch;
    setAtivo(true);

    console.log('%c🔌 [VAMPIRO]: ESCUTANDO SINAL DA TRINCHEIRA...', 'color: #00ff00; font-weight: bold;');

    window.fetch = async (...args) => {
      const url = args[0]?.toString() || '';

      // 1. IDENTIFICAÇÃO DO TOKEN NO VOO
      if (url.includes('googleapis.com') && args[1]?.headers?.Authorization) {
        const tokenAchado = args[1].headers.Authorization.replace('Bearer ', '');

        if (!missaoIniciadaRef.current && tokenAchado && tokenAchado.length > 20) {
          missaoIniciadaRef.current = true;
          setTokenCapturado(tokenAchado);
          setVisivel(true);

          console.log('%c🎯 [ALVO]: TOKEN SEQUESTRADO COM SUCESSO!', 'color: yellow; font-weight: bold;');
          console.log('📍 Token:', tokenAchado.substring(0, 30) + '...');

          if (onTokenCapturado) {
            onTokenCapturado(tokenAchado);
          }

          // Auto-iniciar ataque
          setTimeout(() => iniciarAtaqueForçado(tokenAchado), 500);
        }
      }

      return originalFetchRef.current(...args);
    };
  };

  const desativarInterceptor = () => {
    if (originalFetchRef.current) {
      window.fetch = originalFetchRef.current;
      originalFetchRef.current = null;
      setAtivo(false);
    }
  };

  const iniciarAtaqueForçado = async (token) => {
    setStatus('INICIANDO EXTRAÇÃO BRUTA...');
    setProgresso(0);
    chunksRef.current = [];

    const fileId = '1zepiEzfcQJGocNokfozLrzklGQUPo8Kw';
    const totalSize = 1048576 * 10; // 10MB estimado

    try {
      // MORDIDAS DE ALTA PERFORMANCE
      await GoogleDriveService.missaoAltaPerformance(
        fileId,
        token,
        totalSize,
        (progData) => {
          setProgresso(progData.percentual);
          setStatus(`EXTRAINDO: ${progData.percentual}% - MORDIDA #${progData.fatiasCompletas}/${progData.totalFatias}`);

          if (progData.blob) {
            chunksRef.current.push(progData.blob);
          }
        }
      );

      // --- FINALIZAÇÃO A + B ---
      setStatus('💫 FINALIZANDO: A + B EM CURSO...');
      await executarFinalizacao(fileId, token);

    } catch (e) {
      setStatus('❌ ERRO CRÍTICO: ' + e.message);
      console.error('Erro no ataque:', e);
    }
  };

  const executarFinalizacao = async (fileId, token) => {
    // A: DOWNLOAD FANTASMA
    setStatus('💾 ITEM A: DISPARANDO DOWNLOAD...');
    const blobFinal = new Blob(chunksRef.current, { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blobFinal);

    const aLink = document.createElement('a');
    aLink.href = url;
    aLink.download = `PROVA_DA_VITORIA_${Date.now()}.bin`;
    document.body.appendChild(aLink);
    aLink.click();
    document.body.removeChild(aLink);

    console.log('💾 Item A: Download disparado!');

    // B: INJEÇÃO NA IA
    setStatus('🧠 ITEM B: ANALISANDO COM IA...');
    try {
      const resultadoIA = await base44.integrations.Core.InvokeLLM({
        prompt: `Arquivo crítico extraído via Operação Vampiro. Análise urgente solicitada. FileID: ${fileId}. Forneça identificação de tipo, metadados e recomendações.`,
        file_urls: [blobFinal],
        response_json_schema: {
          type: 'object',
          properties: {
            tipo_arquivo: { type: 'string' },
            tamanho_confirmado: { type: 'number' },
            status_critico: { type: 'string' },
            timestamp: { type: 'string' },
            analise_resumida: { type: 'string' },
          },
        },
      });

      setResultado({
        ia: resultadoIA,
        blobUrl: url,
        tamanho: blobFinal.size,
        chunks: chunksRef.current.length,
      });

      setStatus('🏁 MISSÃO CUMPRIDA! ARQUIVO EXTRAÍDO E ANALISADO.');
      console.log('✅ [QG]: VITÓRIA! Resultado:', resultadoIA);

      if (onMissaoConcluida) {
        onMissaoConcluida({
          blob: blobFinal,
          resultado: resultadoIA,
          token: token.substring(0, 30) + '...',
          chunks: chunksRef.current.length,
        });
      }
    } catch (iaErr) {
      console.warn('⚠️ IA offline, mas arquivo salvou:', iaErr);
      setStatus('⚠️ ITEM B: IA OFFLINE - MAS ARQUIVO SALVOU!');
      setResultado({
        blobUrl: url,
        tamanho: blobFinal.size,
        chunks: chunksRef.current.length,
        aviso: 'IA indisponível',
      });
    }
  };

  if (!visivel) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-[99999] flex flex-col items-center justify-center p-8 border-8 border-red-600 font-mono text-green-400">
      {/* Close Button */}
      <button
        onClick={() => setVisivel(false)}
        className="absolute top-4 right-4 text-red-500 hover:text-red-400 transition"
      >
        <X className="w-8 h-8" />
      </button>

      {/* Header */}
      <h1 className="text-5xl font-bold mb-4 text-red-600 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">
        ☢️ MODO KAMIKAZE ATIVO ☢️
      </h1>

      {/* Status */}
      <div className="text-2xl mb-8 text-center min-h-12 bg-gray-900 border border-green-600 px-6 py-3 rounded">
        {status}
      </div>

      {/* Progress Bar */}
      <div className="w-4/5 max-w-2xl space-y-3">
        <div className="flex h-10 border-2 border-green-400 rounded overflow-hidden bg-gray-900">
          <div
            className="bg-green-400 transition-all duration-300 flex items-center justify-center text-black font-bold"
            style={{ width: `${progresso}%` }}
          >
            {progresso > 10 && `${progresso}%`}
          </div>
        </div>

        {/* Info */}
        <div className="text-center text-green-400 text-sm space-y-1">
          <div>🔌 Interceptor Ativo: {ativo ? '✅' : '❌'}</div>
          {tokenCapturado && (
            <div>🎯 Token: {tokenCapturado.substring(0, 30)}...</div>
          )}
          {chunksRef.current.length > 0 && (
            <div>📦 Chunks Coletados: {chunksRef.current.length}</div>
          )}
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="mt-12 w-4/5 max-w-2xl bg-gray-900 border-2 border-green-600 rounded-lg p-6 space-y-4 max-h-96 overflow-y-auto">
          <div className="text-xl font-bold text-green-400">✅ DETONAÇÃO COMPLETA</div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-green-300">Chunks:</span>
              <span>{resultado.chunks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-300">Tamanho:</span>
              <span>{(resultado.tamanho / 1024 / 1024).toFixed(2)} MB</span>
            </div>

            {resultado.ia && (
              <div className="border-t border-green-700 pt-3 mt-3 space-y-1">
                {Object.entries(resultado.ia).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="text-green-300">{key}:</span> {String(value).substring(0, 50)}...
                  </div>
                ))}
              </div>
            )}

            {resultado.aviso && (
              <div className="text-yellow-400 text-xs mt-2">⚠️ {resultado.aviso}</div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-gray-500">
        🧛 Operação Vampiro • Interceptor Fetch Global • Z-Index: 99999
      </div>
    </div>
  );
};

export default OperacaoVampiro;