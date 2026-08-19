import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const pdfGeneratorService = {
  /**
   * Génération et téléchargement du PDF A4 certifié avec capture de la carte Leaflet
   */
  async generateSinistrePdf(elementId, dossierRef = 'Rapport-Sinistre') {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Élément #${elementId} introuvable pour la génération PDF`);
    }

    // 1. Capture instantanée de la carte Leaflet affichée à l'écran
    const mapElement = document.getElementById('sinistre-map-leaflet-container') || document.querySelector('.leaflet-container');
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
        console.warn('[PDF] Impossible de capturer la carte Leaflet:', e);
      }
    }

    // 2. Afficher temporairement l'élément PDF
    const prevDisplay = element.style.display;
    element.style.display = 'block';

    // Laisser 100ms au DOM pour insérer l'image de la carte
    await new Promise(res => setTimeout(res, 100));

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Première page
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Pages suivantes si nécessaire
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`${dossierRef}.pdf`);
      return true;
    } catch (err) {
      console.error('[PDFGenerator] Erreur:', err);
      throw err;
    } finally {
      element.style.display = prevDisplay;
    }
  }
};
