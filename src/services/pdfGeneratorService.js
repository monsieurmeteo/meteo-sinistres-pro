import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const pdfGeneratorService = {
  /**
   * Génération et téléchargement du PDF A4 certifié
   */
  async generateSinistrePdf(elementId, dossierRef = 'Rapport-Sinistre') {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Élément #${elementId} introuvable pour la génération PDF`);
    }

    // Afficher temporairement l'élément s'il est masqué
    const prevDisplay = element.style.display;
    element.style.display = 'block';

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
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
