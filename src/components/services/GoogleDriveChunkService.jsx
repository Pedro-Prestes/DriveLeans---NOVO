/**
 * SERVIÇO DE DOWNLOAD COM RANGE REQUESTS (Fatiamento 1MB)
 * Frontend como Motor Principal
 */

const CHUNK_SIZE = 1048576; // 1MB

const GOOGLE_CONFIG = {
  clientId: '828777380339-4l0dnujgv95013qat827h8bff8b2qv3g.apps.googleusercontent.com',
  clientSecret: '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',
  refreshToken: '1//04sHGxvCoRz0yCgYIARAAGAQSNgF-L9Irk6pFvFtZ7zWDWOA6QL5OmvXIMVx-9hAt1KuDbw2PCHzCOITbjXVTQ6G24IcIo5T6qw',
  tokenUrl: 'https://oauth2.googleapis.com/token',
};

export const GoogleDriveChunkService = {
  /**
   * Gera access token automaticamente usando refresh token
   */
  async getAccessToken() {
    try {
      console.log('🔄 Renovando Access Token...');
      
      const params = new URLSearchParams({
        client_id: GOOGLE_CONFIG.clientId,
        client_secret: GOOGLE_CONFIG.clientSecret,
        refresh_token: GOOGLE_CONFIG.refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await fetch(GOOGLE_CONFIG.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error('Falha ao renovar token');
      }

      console.log('✅ Access Token gerado com sucesso');
      return data.access_token;
    } catch (error) {
      console.error('❌ Erro ao renovar token:', error);
      throw error;
    }
  },
  /**
   * Obtém metadados do arquivo (com token automático se não fornecido)
   */
  async getMetadata(fileId, token) {
    console.log('📡 1. Obtendo Metadados...');
    
    const accessToken = token || await this.getAccessToken();
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao obter metadados: ${response.status}`);
    }

    const metadata = await response.json();
    console.log('✅ Arquivo identificado:', metadata.name);

    return {
      name: metadata.name,
      mimeType: metadata.mimeType,
      size: parseInt(metadata.size, 10),
    };
  },

  /**
   * Download do arquivo completo - sem Range Requests (mais confiável)
   */
  async downloadInChunks(fileId, token, totalSize, onProgress) {
    const accessToken = token || await this.getAccessToken();
    
    console.log(`📥 Iniciando download de ${totalSize} bytes...`);
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro no download: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log(`✅ Blob recebido: ${blob.size} bytes`);

    if (onProgress) {
      onProgress({ percentual: 100, totalBytes: blob.size });
    }

    return [blob];
  },

  /**
   * Calcula hash SHA-256 para integridade
   */
  async calculateHash(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Reconstrói arquivo a partir dos chunks com tipo MIME correto
   */
  reconstructFile(chunks, mimeType = 'application/octet-stream') {
    console.log('🔧 Reconstruindo arquivo...');
    const blob = new Blob(chunks, { type: mimeType });
    console.log(`✅ Arquivo reconstruído: ${blob.size} bytes`);
    return blob;
  },

  /**
   * Extrai texto de PDF se aplicável
   */
  async extractPDFText(blob, mimeType) {
    if (mimeType !== 'application/pdf') {
      return null;
    }

    try {
      const { PDFExtractorService } = await import('./PDFExtractorService');
      const result = await PDFExtractorService.extractTextFromBlob(blob);
      return result.success ? result.text : null;
    } catch (error) {
      console.warn('⚠️ Erro ao extrair texto do PDF:', error.message);
      return null;
    }
  },

  /**
   * Dispara download automático (Item A)
   */
  triggerDownload(blob, fileName) {
    console.log('💾 ITEM A: Disparando Download Automático...');
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'arquivo.bin';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ Download disparado!');
  },

  /**
   * Cria visualização automática (Item B)
   */
  createPreview(blob, mimeType) {
    console.log('👁️ ITEM B: Criando Visualização...');

    const url = URL.createObjectURL(blob);
    return {
      url,
      type: mimeType,
      isPdf: mimeType === 'application/pdf',
      isImage: mimeType.startsWith('image/'),
      isText: mimeType.startsWith('text/'),
    };
  },

  /**
   * Função principal: Executa missão completa (com token automático se não fornecido)
   */
  async executarMissaoCompleta(fileId, token, onProgress) {
    try {
      console.log('🚀 OPERAÇÃO CONVERSÃO TOTAL INICIADA');

      // Se nenhum token foi fornecido, gera automaticamente
      const accessToken = token || await this.getAccessToken();

      // 1. Metadados
      const metadata = await this.getMetadata(fileId, accessToken);

      // 2. Download em chunks
      const chunks = await this.downloadInChunks(
        fileId,
        accessToken,
        metadata.size,
        onProgress
      );

      // 3. Reconstrói arquivo
      const fileBlob = this.reconstructFile(chunks, metadata.mimeType);

      // 4. Calcula integridade
      console.log('🔐 Calculando Hash SHA-256...');
      const integrityHash = await this.calculateHash(fileBlob);
      console.log(`✅ Hash: ${integrityHash}`);

      // 5. Extrai texto se for PDF
      let pdfText = null;
      let pageCount = null;
      if (metadata.mimeType === 'application/pdf') {
        console.log('📄 Extraindo texto do PDF...');
        pdfText = await this.extractPDFText(fileBlob, metadata.mimeType);
        
        // Obtém número de páginas
        try {
          const { PDFExtractorService } = await import('./PDFExtractorService');
          const pdfMeta = await PDFExtractorService.extractMetadata(fileBlob);
          pageCount = pdfMeta.pageCount;
        } catch (error) {
          console.warn('⚠️ Erro ao obter metadados do PDF:', error.message);
        }
      }

      // 6. Constrói resultado
      const result = {
        success: true,
        metadata,
        blob: fileBlob,
        integrityHash,
        fileType: metadata.mimeType,
        isPdf: metadata.mimeType === 'application/pdf',
        preview: this.createPreview(fileBlob, metadata.mimeType),
        content: pdfText || 'Arquivo reconstruído com sucesso',
        pageCount,
      };

      console.log('📊 Resultado Final:', {
        name: metadata.name,
        size: metadata.size,
        type: metadata.mimeType,
        hash: integrityHash,
      });

      return result;
    } catch (error) {
      console.error('❌ Erro na missão:', error);
      throw error;
    }
  },

  /**
   * Dispara Item A + Item B automaticamente
   */
  async finalizarMissao(result) {
    console.log('🎯 FINALIZANDO MISSÃO (A + B)');

    // Item A: Download
    this.triggerDownload(result.blob, result.metadata.name);

    // Item B: Visualização
    return result.preview;
  },

  /**
   * Assalto Binário - Download Direto + Preview
   */
  async assaltoBinario(fileId, token) {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    // Item A: Download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileId;
    a.click();

    // Item B: Preview
    return { url, blob, type: blob.type };
  },
};