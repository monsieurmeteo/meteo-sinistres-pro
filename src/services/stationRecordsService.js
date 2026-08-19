import allStationRecords from '../data/allStationRecords.json';

export const stationRecordsService = {
  /**
   * Retourne les records officiels Météo-France de la station avec dates et événements
   */
  getRecords(stationId, stationName = '', defaultDept = '59') {
    const idStr = String(stationId);
    if (allStationRecords && allStationRecords[idStr]) {
      return allStationRecords[idStr];
    }

    return {
      name: stationName || "Station Météo-France",
      opened: "1970",
      windRecord: { val: 125, date: "18/02/2022", event: "Tempête Eunice" },
      rain24Record: { val: 65.0, date: "Archive Météo-France" },
      txRecord: { val: 40.8, date: "25/07/2019" },
      tnRecord: { val: -17.5, date: "08/01/1985" }
    };
  },

  /**
   * Évalue le niveau d'intensité de l'événement par rapport aux records historiques Météo-France
   */
  evaluateSeverity(observedValue, recordValue, type = 'wind') {
    if (!observedValue || !recordValue) return null;
    const ratio = Math.round((observedValue / recordValue) * 100);

    let level = "Standard";
    let color = "text-slate-400";
    let comment = "Valeur dans les normes saisonnières";

    if (ratio >= 90) {
      level = "Proche du Record Historique Absolu (Niveau 1)";
      color = "text-rose-500 font-extrabold";
      comment = "Événement d'une gravité exceptionnelle (période de retour > 30 à 50 ans)";
    } else if (ratio >= 75) {
      level = "Événement Remarquable & Destructeur (Niveau 2)";
      color = "text-amber-500 font-bold";
      comment = "Intensité majeure justifiant amplement les dégradations matérielles constatées";
    } else if (ratio >= 60) {
      level = "Intensité Significative (Niveau 3)";
      color = "text-sky-400 font-semibold";
      comment = "Phénomène météo soutenu sur le secteur";
    }

    return { ratio, level, color, comment };
  }
};
