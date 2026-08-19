import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const pdfGeneratorService = {
  /**
   * Génération Page par Page certifiée :
   * Capture Page 1 séparément puis Page 2 séparément.
   * Empêche tout chevauchement ou coupure de tableau au milieu de page.
   */
  async generateSinistrePdf(elementId, dossierRef = 'Rapport-Sinistre') {
    const rootElement = document.getElementById(elementId);
    if (!rootElement) {
      throw new Error(`Élément #${elementId} introuvable pour la génération PDF`);
    }

    // 1. Capture propre de la carte Leaflet
    const mapElement = document.getElementById('sinistre-map-leaflet-container');
    if (mapElement) {
      try {
        const mapCanvas = await html2canvas(mapElement, {
          useCORS: true,
          allowTaint: true,
          scale: 2,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const mapDataUrl = mapCanvas.toDataURL('image/jpeg', 0.95);
        const pdfMapImg = document.getElementById('pdf-map-snapshot-img');
        if (pdfMapImg) {
          pdfMapImg.src = mapDataUrl;
          pdfMapImg.style.display = 'block';
        }
      } catch (e) {
        console.warn('[PDF] Erreur capture carte:', e);
      }
    }

    // 2. Afficher temporairement le conteneur PDF
    const prevDisplay = rootElement.style.display;
    rootElement.style.display = 'block';
    await new Promise(res => setTimeout(res, 120));

    try {
      const page1El = document.getElementById('pdf-page-1') || rootElement.children[0];
      const page2El = document.getElementById('pdf-page-2') || rootElement.children[1];

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

      // Capture Page 1
      if (page1El) {
        const canvas1 = await html2canvas(page1El, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1000
        });
        const img1 = canvas1.toDataURL('image/jpeg', 0.96);
        pdf.addImage(img1, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      // Capture Page 2
      if (page2El) {
        pdf.addPage();
        const canvas2 = await html2canvas(page2El, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1000
        });
        const img2 = canvas2.toDataURL('image/jpeg', 0.96);
        pdf.addImage(img2, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`${dossierRef}.pdf`);
      return true;
    } catch (err) {
      console.error('[PDFGenerator] Erreur:', err);
      throw err;
    } finally {
      rootElement.style.display = prevDisplay;
    }
  }
};
