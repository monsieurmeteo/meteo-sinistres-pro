/**
 * Moteur d'analyse météorologique dynamique par type de sinistre
 * Factualité stricte, synthèse 100-150 mots, aucune extrapolation.
 */
export const weatherAnalysisEngine = {
  getRelevantParameters(claimType = '') {
    const t = (claimType || '').toLowerCase();
    if (t.includes('vent') || t.includes('tempête') || t.includes('rafale')) {
      return { type: 'VENT', columns: ['fxi', 'hxi', 'rr'], kpi: ['fxi', 'rr'] };
    }
    if (t.includes('pluie') || t.includes('inondation') || t.includes('ruissellement')) {
      return { type: 'PLUIE', columns: ['rr', 'fxi'], kpi: ['rr', 'fxi'] };
    }
    if (t.includes('gel') || t.includes('froid')) {
      return { type: 'GEL', columns: ['tn', 'tx', 'rr'], kpi: ['tn', 'tx'] };
    }
    if (t.includes('canicule') || t.includes('chaleur')) {
      return { type: 'CHALEUR', columns: ['tx', 'tn', 'rr'], kpi: ['tx', 'tn'] };
    }
    if (t.includes('foudre')) {
      return { type: 'FOUDRE', columns: ['rr', 'fxi', 'tx'], kpi: ['fxi', 'rr'] };
    }
    if (t.includes('orage') || t.includes('grêle')) {
      return { type: 'ORAGE', columns: ['fxi', 'hxi', 'rr', 'tx'], kpi: ['fxi', 'rr', 'tx'] };
    }
    return { type: 'GENERAL', columns: ['rr', 'fxi', 'hxi', 'tn', 'tx'], kpi: ['fxi', 'rr', 'tx'] };
  },

  generateAnalysis(sinistreInfo = {}, stationsData = []) {
    if (!stationsData || stationsData.length === 0) {
      return {
        text: "Aucune observation disponible pour les stations sélectionnées à cette date.",
        confidence: { level: "Faible", score: 20 },
        kpis: []
      };
    }

    const validStations = stationsData.filter(s => s.obs && s.obs.date);
    const count = validStations.length;
    const s1 = validStations[0] || stationsData[0];
    const claimType = sinistreInfo.sinistreType || 'Événement météorologique';
    const params = this.getRelevantParameters(claimType);

    const gusts = validStations.map(s => s.obs?.fxi).filter(v => v !== null && v !== undefined);
    const rains = validStations.map(s => s.obs?.rr).filter(v => v !== null && v !== undefined);
    const tmaxs = validStations.map(s => s.obs?.tx).filter(v => v !== null && v !== undefined);
    const tmins = validStations.map(s => s.obs?.tn).filter(v => v !== null && v !== undefined);

    const maxGust = gusts.length > 0 ? Math.max(...gusts) : null;
    const maxRain = rains.length > 0 ? Math.max(...rains) : null;
    const maxT = tmaxs.length > 0 ? Math.max(...tmaxs) : null;
    const minT = tmins.length > 0 ? Math.min(...tmins) : null;

    const bestWindSt = validStations.find(s => s.obs?.fxi === maxGust) || s1;
    const bestRainSt = validStations.find(s => s.obs?.rr === maxRain) || s1;

    // 1. Structure de rédaction sobre (100 à 150 mots)
    const sentences = [];

    // Introduction
    sentences.push(
      `Station principale : ${s1.name}, située à ${s1.distance} km du lieu du sinistre (${sinistreInfo.commune || 'commune déclarée'}).`
    );

    // Analyse selon le type de sinistre
    if (params.type === 'VENT' || params.type === 'ORAGE') {
      if (maxGust !== null) {
        if (bestWindSt.id === s1.id) {
          sentences.push(
            `La rafale maximale relevée parmi les stations étudiées atteint ${maxGust} km/h à ${s1.name}${s1.obs.hxi ? ' à ' + s1.obs.hxi : ''}.`
          );
        } else {
          sentences.push(
            `La rafale maximale relevée parmi les stations étudiées atteint ${maxGust} km/h à ${bestWindSt.name} (${bestWindSt.distance} km)${bestWindSt.obs?.hxi ? ' à ' + bestWindSt.obs.hxi : ''}. La station principale de ${s1.name} relève quant à elle ${s1.obs?.fxi !== null ? s1.obs.fxi + ' km/h' : 'N/D'}${s1.obs?.hxi ? ' à ' + s1.obs.hxi : ''}.`
          );
        }
      }
      if (maxRain !== null && maxRain > 0) {
        sentences.push(`Le cumul pluviométrique le plus important observé sur l'épisode est de ${maxRain} mm à ${bestRainSt.name}.`);
      }
    } else if (params.type === 'PLUIE') {
      if (maxRain !== null) {
        sentences.push(
          `Le cumul pluviométrique maximal enregistré atteint ${maxRain} mm à ${bestRainSt.name} (${bestRainSt.distance} km), avec ${s1.obs?.rr !== null ? s1.obs.rr + ' mm' : 'N/D'} relevés sur le poste principal de ${s1.name}.`
        );
      }
      if (maxGust !== null && maxGust >= 50) {
        sentences.push(`Des rafales de vent concomitantes ont été mesurées jusqu'à ${maxGust} km/h à ${bestWindSt.name}.`);
      }
    } else if (params.type === 'GEL') {
      if (minT !== null) {
        sentences.push(
          `La température minimale observée s'établit à ${minT}°C à ${s1.name} (${s1.distance} km), confirmant la survenue de températures négatives sous abri.`
        );
      }
    } else if (params.type === 'CHALEUR') {
      if (maxT !== null) {
        sentences.push(
          `La température maximale mesurée atteint ${maxT}°C à ${s1.name} (${s1.distance} km) au cours de la journée.`
        );
      }
    } else if (params.type === 'FOUDRE') {
      sentences.push(
        `Aucune donnée de détection de foudre n'est intégrée à cette analyse. Le présent rapport décrit uniquement les conditions météorologiques observées sur le réseau de stations.`
      );
      if (maxGust !== null) sentences.push(`Rafale maximale observée : ${maxGust} km/h à ${bestWindSt.name}.`);
      if (maxRain !== null) sentences.push(`Cumul de pluie observé : ${maxRain} mm à ${bestRainSt.name}.`);
    } else {
      if (maxGust !== null) sentences.push(`Rafale maximale observée : ${maxGust} km/h (${bestWindSt.name}).`);
      if (maxRain !== null) sentences.push(`Cumul pluviométrique : ${maxRain} mm (${bestRainSt.name}).`);
    }

    // Conclusion sobre
    sentences.push(
      `Les valeurs présentées dans ce rapport sont issues des sources météorologiques indiquées et sont associées aux stations, dates et heures correspondantes afin d'en assurer la traçabilité.`
    );

    // KPI Cards for Page 1
    const kpis = [];
    if (maxGust !== null) {
      kpis.push({
        icon: '💨',
        label: 'Rafale maximale observée',
        val: `${maxGust} km/h`,
        sub: `${bestWindSt.name} (${bestWindSt.distance} km)${bestWindSt.obs?.hxi ? ' à ' + bestWindSt.obs.hxi : ''}`
      });
    }
    if (maxRain !== null) {
      kpis.push({
        icon: '🌧️',
        label: 'Cumul maximal de pluie',
        val: `${maxRain} mm`,
        sub: `${bestRainSt.name} (${bestRainSt.distance} km)`
      });
    }
    if (maxT !== null && (params.type === 'CHALEUR' || params.type === 'ORAGE' || params.type === 'GENERAL')) {
      kpis.push({
        icon: '🌡️',
        label: 'Température maximale',
        val: `${maxT} °C`,
        sub: `Station de ${s1.name}`
      });
    }
    if (minT !== null && params.type === 'GEL') {
      kpis.push({
        icon: '🧊',
        label: 'Température minimale',
        val: `${minT} °C`,
        sub: `Station de ${s1.name}`
      });
    }
    kpis.push({
      icon: '📍',
      label: 'Station la plus proche',
      val: `${s1.name}`,
      sub: `Distante de ${s1.distance} km`
    });

    return {
      text: sentences.join('\n\n'),
      kpis: kpis.slice(0, 4),
      params
    };
  }
};
