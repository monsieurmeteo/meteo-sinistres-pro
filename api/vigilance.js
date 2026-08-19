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

let tokenCache = { tok: null, exp: 0 };
let echeancesCache = { data: null, exp: 0 };

async function getToken() {
  const now = Date.now();
  if (tokenCache.tok && now < tokenCache.exp) {
    return tokenCache.tok;
  }
  try {
    const res = await fetch('https://vigilance.encelade.cloud/historique/api/token', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (res.ok) {
      const tok = (await res.text()).trim();
      tokenCache = { tok, exp: now + 3600000 }; // 1h cache
      return tok;
    }
  } catch (e) {
    console.error('Token fetch error:', e);
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { dept = '59', date = '' } = req.query;
  const formattedDept = String(dept).padStart(2, '0').slice(0, 2);
  const cleanDate = date ? date.slice(0, 10) : '';

  if (!cleanDate) {
    return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });
  }

  try {
    const token = await getToken();
    if (!token) throw new Error('Could not retrieve archive token');

    const headers = {
      'X-VIGI-TOKEN': token,
      'Referer': 'https://vigilance.encelade.cloud/historique',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0'
    };

    const now = Date.now();
    let echeances = echeancesCache.data;
    if (!echeances || now > echeancesCache.exp) {
      const echRes = await fetch('https://vigilance.encelade.cloud/historique/api/get_echeances', { headers });
      if (echRes.ok) {
        echeances = await echRes.json();
        echeancesCache = { data: echeances, exp: now + 600000 }; // 10 min cache
      }
    }

    if (Array.isArray(echeances)) {
      // Calcul du jour précédent (J-1) pour capturer les alertes émises la veille à 16h couvrant la nuit et le jour J
      const dObj = new Date(cleanDate);
      const prevDObj = new Date(dObj);
      prevDObj.setDate(prevDObj.getDate() - 1);
      const prevDate = prevDObj.toISOString().slice(0, 10);

      const relevantBulletins = echeances.filter(b => {
        if (!b.e) return false;
        if (b.e.startsWith(cleanDate)) return true;
        if (b.e.startsWith(prevDate)) {
          const hour = parseInt(b.e.slice(11, 13), 10);
          return hour >= 14; // Bulletin émis à 16h/20h couvrant la nuit du sinistre
        }
        return false;
      });

      if (relevantBulletins.length > 0) {
        let maxLevel = 1;
        let activePhenos = [];
        let selectedBulletin = relevantBulletins[0];

        for (const b of relevantBulletins) {
          try {
            const detRes = await fetch(`https://vigilance.encelade.cloud/historique/api/get_vigilance/${b.id}`, { headers });
            if (detRes.ok) {
              const det = await detRes.json();
              const dptRows = (det.rows || []).filter(r => String(r.dpt) === formattedDept || String(r.dpt).padStart(2, '0') === formattedDept);

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
            console.warn(`Error reading bulletin ${b.id}:`, err);
          }
        }

        const levelNames = { 1: 'Vert', 2: 'Jaune', 3: 'Orange', 4: 'Rouge' };
        return res.status(200).json({
          dept: formattedDept,
          date: cleanDate,
          level: levelNames[maxLevel] || 'Vert',
          phenos: activePhenos,
          bulletinId: selectedBulletin ? selectedBulletin.id : null,
          bulletinDate: selectedBulletin ? selectedBulletin.e : cleanDate,
          source: selectedBulletin ? `Archives Météo-France (Bulletin #${selectedBulletin.id})` : "Archives Officielles Météo-France"
        });
      }
    }

    return res.status(200).json({
      dept: formattedDept,
      date: cleanDate,
      level: 'Vert',
      phenos: [],
      source: "Archives Officielles Météo-France (Situation normale)"
    });

  } catch (e) {
    console.error('API vigilance error:', e);
    return res.status(500).json({ error: e.message });
  }
}
