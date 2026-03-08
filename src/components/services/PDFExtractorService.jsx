import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export class PDFExtractorService {
  /**
   * Extrai texto de um PDF a partir de um Blob
   */
  static async extractTextFromBlob(blob) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';
      const pageCount = pdf.numPages;

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullText += `\n--- Página ${i} ---\n${pageText}`;
      }

      return {
        success: true,
        text: fullText.trim(),
        pageCount,
        error: null,
      };
    } catch (error) {
      console.error('❌ Erro ao extrair texto do PDF:', error);
      return {
        success: false,
        text: '',
        pageCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Extrai texto de um PDF a partir de uma URL
   */
  static async extractTextFromUrl(url) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return await this.extractTextFromBlob(blob);
    } catch (error) {
      console.error('❌ Erro ao baixar PDF:', error);
      return {
        success: false,
        text: '',
        pageCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Extrai metadados do PDF (número de páginas, título, etc)
   */
  static async extractMetadata(blob) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const metadata = await pdf.getMetadata();
      
      return {
        success: true,
        pageCount: pdf.numPages,
        metadata: metadata.info || {},
      };
    } catch (error) {
      console.error('❌ Erro ao extrair metadados do PDF:', error);
      return {
        success: false,
        pageCount: 0,
        metadata: {},
      };
    }
  }
}