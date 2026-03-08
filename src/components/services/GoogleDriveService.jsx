export class GoogleDriveService {
  async baixarAgora(fileId, token) {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.body.appendChild(document.createElement('a'));
    a.href = url;
    a.download = 'extração_base44.bin';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async missaoExtraçãoTotal(fileId, token) {
    console.log("%c📡 PROTOCOLO BASE44: EXTRAÇÃO TOTAL", "color: #00ff00");
    
    try {
      if (!token) {
        throw new Error("Token não fornecido. Por favor, insira um token válido ou use o checkbox com Range Requests + token.");
      }

      const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,md5Checksum,size`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!metaRes.ok) {
        throw new Error(`Erro ao obter metadados: ${metaRes.status}`);
      }

      const metadata = await metaRes.json();
      console.log(`🎯 ALVO: ${metadata.name}`);

      let response;
      if (metadata.mimeType.includes('google-apps')) {
        response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const isPdf = metadata.mimeType === 'application/pdf' || metadata.mimeType.includes('pdf');

      const resultado = {
        content: url,
        fileType: metadata.mimeType,
        integrityHash: metadata.md5Checksum || "N/A",
        isPdf: isPdf,
        pageCount: null
      };

      console.log("📊 RESULTADO:", resultado);

      const link = document.createElement('a');
      link.href = url;
      link.download = metadata.name || "extração_base44.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (isPdf) {
        const frame = document.createElement('iframe');
        frame.src = url;
        frame.style = "position:fixed; bottom:20px; right:20px; width:300px; height:400px; border:2px solid #0f0; z-index:9999;";
        document.body.appendChild(frame);
      }

      alert("✅ MISSÃO CUMPRIDA!");
      return resultado;

    } catch (err) {
      console.error("💀 FALHA:", err);
      alert("🚨 ERRO: Verifique o Token!");
    }
  }

  async executarAgora(fileId, token) {
    console.clear();
    return await this.missaoExtraçãoTotal(fileId, token);
  }

  visualizarArquivo(urlBlob) {
    const url = urlBlob || window.URL_FINAL_DA_MISSAO || prompt("Insira a URL do Blob:");

    if (!url) {
      console.error("❌ Erro: Nenhum rastro de arquivo encontrado para visualização.");
      return;
    }

    const moldura = document.createElement('div');
    moldura.id = "visualizador-comandante";
    moldura.style = `
        position: fixed; top: 50%; left: 50%; 
        transform: translate(-50%, -50%);
        width: 80vw; height: 80vh; 
        background: white; border: 5px solid #0f0;
        z-index: 100000; box-shadow: 0 0 50px rgba(0,255,0,0.5);
        display: flex; flex-direction: column;
    `;

    const fechar = document.createElement('button');
    fechar.innerText = "❌ FECHAR VISUALIZADOR";
    fechar.style = "background: red; color: white; border: none; padding: 10px; cursor: pointer; font-weight: bold;";
    fechar.onclick = () => moldura.remove();
    moldura.appendChild(fechar);

    const visor = document.createElement('iframe');
    visor.src = url;
    visor.style = "flex-grow: 1; border: none;";
    
    moldura.appendChild(visor);
    document.body.appendChild(moldura);

    console.log("✅ [VISUALIZADOR]: ALVO RENDERIZADO NA INTERFACE!");
  }
}