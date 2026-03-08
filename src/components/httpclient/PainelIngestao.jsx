import React, { useState } from 'react';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Zap } from 'lucide-react';

const PainelIngestao = ({ fileId, token, totalSize }) => {
  const [progresso, setProgresso] = useState(0);
  const [status, setStatus] = useState('Pronto para Ingestão');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState(null);

  const iniciarMissao = async () => {
    setCarregando(true);
    setSucesso(false);
    setErro(null);
    setProgresso(0);
    setStatus('Iniciando Ataque Coordenado...');

    try {
      const resultado = await GoogleDriveService.missaoAltaPerformance(
        fileId,
        token,
        totalSize,
        (progData) => {
          setProgresso(progData.percentual);
          setStatus(`Capturando: ${progData.percentual}% concluído (${progData.fatiasCompletas}/${progData.totalFatias} fatias)`);
        }
      );

      setProgresso(100);
      setStatus('✅ Missão Cumprida! Arquivo na Base.');
      setSucesso(true);

      // Opcionalmente, abrir o arquivo
      if (resultado.blob) {
        const url = URL.createObjectURL(resultado.blob);
        console.log('📥 Arquivo disponível para download/visualização:', url);
      }
    } catch (err) {
      setErro(err.message || 'Erro desconhecido');
      setStatus('❌ FALHA NA OPERAÇÃO: ' + err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 text-white rounded-lg border border-blue-500 shadow-lg space-y-4">
      <div className="flex items-center gap-3">
        <Zap className="w-6 h-6 text-blue-400" />
        <h3 className="text-xl font-bold">🛰️ Terminal de Captura Google Drive</h3>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progresso} className="h-2" />
        <div className="flex justify-between text-xs text-blue-300 font-mono">
          <span>{status}</span>
          <span>{progresso}%</span>
        </div>
      </div>

      {/* Status Messages */}
      {sucesso && (
        <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-500 rounded text-green-300 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>Arquivo reconstruído com sucesso!</span>
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-500 rounded text-red-300 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{erro}</span>
        </div>
      )}

      {/* Button */}
      <div className="pt-2">
        <Button
          onClick={iniciarMissao}
          disabled={carregando}
          className={`w-full py-2 px-6 rounded font-bold uppercase tracking-wider transition-all ${
            carregando
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 active:scale-95'
          }`}
        >
          {carregando ? '⚙️ Processando...' : '🚀 Lançar Captura'}
        </Button>
      </div>
    </div>
  );
};

export default PainelIngestao;