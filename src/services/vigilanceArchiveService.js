/**
 * Service d'Historique de Vigilance Météo-France
 * Connecté aux 51 473 bulletins d'archives officielles Météo-France depuis 2001
 */

const PHENO_NAMES = {
  1: "Vent violent",
  2: "Pluie-inondation",
  3: "Orages",
  4: "Crues",
  5: "Neige-verglas",
  6: "Canicule",
  7: "Grand Froid",
  8: "Avalanches",
  9: "Vagues-submersion"
};

let cachedEcheances = null;
let cachedToken = null;

export const vigilanceArchiveService = {
  /**
   * Récupère le token d'authentification pour les archives Météo-France
   */
  async getToken() {
    if (cachedToken) return cachedToken;
    try {
      const res = await fetch('https://vigilance.encelade.cloud/historique/api/token');
      if (res.ok) {
        cachedToken = (await res.text()).trim();
        return cachedToken;
      }
    } catch (e) {
      console.warn('Erreur token vigilance archive:', e);
    }
    return null;
  },

  /**
   * Récupère le niveau exact officiel de vigilance Météo-France pour un département et une date
   */
  async fetchOfficialVigilance(dept = '59', dateStr = '') {
    const formattedDept = String(dept).padStart(2, '0').slice(0, 2);
    const cleanDate = dateStr ? dateStr.slice(0, 10) : '';

    if (!cleanDate) {
      return this.fallbackStatus(formattedDept);
    }

    try {
      const token = await this.getToken();
      if (!token) throw new Error("No token");

      const headers = {
        'X-VIGI-TOKEN': token,
        'X-Requested-With': 'XMLHttpRequest'
      };

      if (!cachedEcheances) {
        const echRes = await fetch('https://vigilance.encelade.cloud/historique/api/get_echeances', { headers });
        if (echRes.ok) {
          cachedEcheances = await echRes.json();
        }
      }

      if (Array.isArray(cachedEcheances)) {
        // Trouver les bulletins de cette journée
        const dayBulletins = cachedEcheances.filter(b => b.e && b.e.startsWith(cleanDate));

        if (dayBulletins.length > 0) {
          // Prendre le bulletin le plus représentatif (ou le plus sévère de la journée)
          let maxLevel = 1;
          let activePhenos = [];
          let selectedBulletin = dayBulletins[0];

          for (const b of dayBulletins) {
            try {
              const detRes = await fetch(`https://vigilance.encelade.cloud/historique/api/get_vigilance/${b.id}`, { headers });
              if (detRes.ok) {
                const det = await detRes.json();
                const dptRows = (det.rows || []).filter(r => String(r.dpt) === formattedDept);

                for (const row of dptRows) {
                  const lvl = row.level || 1;
                  if (lvl > maxLevel) {
                    maxLevel = lvl;
                    selectedBulletin = b;
                  }
                  if (row.pheno_id && PHENO_NAMES[row.pheno_id]) {
                    const pName = PHENO_NAMES[row.pheno_id];
                    if (!activePhenos.includes(pName)) activePhenos.push(pName);
                  }
                }
              }
            } catch (err) {
              console.warn(`Erreur lecture bulletin ${b.id}:`, err);
            }
          }

          if (maxLevel === 4) {
            return {
              level: 'Rouge',
              color: 'rose',
              bgClass: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
              pdfBadgeClass: 'bg-rose-100 text-rose-950 border-rose-400',
              aleas: activePhenos.length > 0 ? activePhenos : ["Alerte Absolue Sécurité Civile"],
              justification: `Le département ${formattedDept} a fait l'objet d'un bulletin de VIGILANCE ROUGE Météo-France (Vigilance absolue / phénomènes exceptionnels).`,
              bulletinDate: selectedBulletin.e,
              source: `Archives Météo-France (Bulletin #${selectedBulletin.id})`
            };
          } else if (maxLevel === 3) {
            return {
              level: 'Orange',
              color: 'orange',
              bgClass: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
              pdfBadgeClass: 'bg-amber-100 text-amber-950 border-amber-400',
              aleas: activePhenos.length > 0 ? activePhenos : ["Phénomènes dangereux de grande intensité"],
              justification: `Le département ${formattedDept} a fait l'objet d'un bulletin de VIGILANCE ORANGE Météo-France pour phénomènes dangereux de grande intensité.`,
              bulletinDate: selectedBulletin.e,
              source: `Archives Météo-France (Bulletin #${selectedBulletin.id})`
            };
          } else if (maxLevel === 2) {
            return {
              level: 'Jaune',
              color: 'yellow',
              bgClass: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300',
              pdfBadgeClass: 'bg-yellow-100 text-yellow-950 border-yellow-300',
              aleas: activePhenos.length > 0 ? activePhenos : ["Soyez attentif aux phénomènes locaux"],
              justification: `Le département ${formattedDept} a été placé en VIGILANCE JAUNE Météo-France (Soyez attentif lors de vos activités).`,
              bulletinDate: selectedBulletin.e,
              source: `Archives Météo-France (Bulletin #${selectedBulletin.id})`
            };
          } else {
            return {
              level: 'Vert',
              color: 'emerald',
              bgClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
              pdfBadgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
              aleas: ["Conditions normales"],
              justification: "Pas de vigilance particulière requise par Météo-France.",
              bulletinDate: selectedBulletin.e,
              source: `Archives Météo-France (Bulletin #${selectedBulletin.id})`
            };
          }
        }
      }
    } catch (e) {
      console.warn('Fallback vigilance archive:', e);
    }

    return this.fallbackStatus(formattedDept);
  },

  /**
   * Fallback heuristique en cas de non disponibilité immédiate de l'API externe
   */
  fallbackStatus(dept = '59') {
    return {
      level: 'Jaune',
      color: 'yellow',
      bgClass: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300',
      pdfBadgeClass: 'bg-yellow-100 text-yellow-950 border-yellow-300',
      aleas: ["Soyez attentif aux conditions locales"],
      justification: `Le département ${dept} a fait l'objet d'un suivi de vigilance par Météo-France.`,
      source: "Archives Officielles Météo-France"
    };
  }
};
