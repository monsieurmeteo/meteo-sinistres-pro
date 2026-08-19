import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Download, RefreshCw, AlertCircle, 
  Wind, Droplets, Sun, Thermometer, Search, X, MapPin
} from 'lucide-react';
import { 
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, 
  CartesianGrid
} from 'recharts';
import { meteoFranceClimService } from '../../services/meteoFranceClimService';
import normalsData from '../../data/normals_1991_2020.json';
import stationDatabase from '../../data/stationDatabase.json';

const MONTHS = [
  { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' }, { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' }, { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' }
];

export default function MonthlyClimateTable({ initialStationId = '59343001', initialStationName = 'Lille-Lesquin' }) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [selectedStationId, setSelectedStationId] = useState(initialStationId);
  const [selectedStationName, setSelectedStationName] = useState(initialStationName);
  const [stationSearch, setStationSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState(null);

  const years = useMemo(() => {
    const list = [];
    for (let y = currentYear; y >= 1950; y--) list.push(y);
    return list;
  }, [currentYear]);

  const stationsList = useMemo(() => {
    return Array.isArray(stationDatabase) ? stationDatabase : [];
  }, []);

  const filteredStations = useMemo(() => {
    if (!stationSearch.trim()) return stationsList.slice(0, 100);
    const q = stationSearch.toLowerCase();
    return stationsList.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.id.includes(q) || 
      (s.dept && s.dept.toString().includes(q))
    ).slice(0, 100);
  }, [stationsList, stationSearch]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setProgressMsg('Initialisation…');

    try {
      const padM = String(selectedMonth).padStart(2, '0');
      const startISO = `${selectedYear}-${padM}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endISO = `${selectedYear}-${padM}-${String(lastDay).padStart(2, '0')}`;

      const history = await meteoFranceClimService.fetchStationHistory(
        selectedStationId,
        startISO,
        endISO,
        setProgressMsg
      );

      setData(history);
    } catch (err) {
      console.error('[MonthlyClimateTable] Erreur:', err);
      setError(err.message || 'Impossible de récupérer les données Météo-France');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStationId, selectedYear, selectedMonth]);

  const monthNormal = useMemo(() => {
    const stNorms = normalsData[selectedStationId] || normalsData['59343001'] || null;
    if (!stNorms || !stNorms.months) return null;
    return stNorms.months[selectedMonth - 1] || null;
  }, [selectedStationId, selectedMonth]);

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;

    let sumTn = 0, countTn = 0, minTn = null, minTnDay = null;
    let sumTx = 0, countTx = 0, maxTx = null, maxTxDay = null;
    let sumTm = 0, countTm = 0;
    let sumRR = 0, countRainDays = 0;
    let maxGust = null, maxGustDay = null;
    let frostDays = 0, heatDays = 0;

    data.forEach(d => {
      if (d.tn !== null && d.tn !== undefined) {
        sumTn += d.tn; countTn++;
        if (minTn === null || d.tn < minTn) { minTn = d.tn; minTnDay = d; }
        if (d.tn < 0) frostDays++;
      }
      if (d.tx !== null && d.tx !== undefined) {
        sumTx += d.tx; countTx++;
        if (maxTx === null || d.tx > maxTx) { maxTx = d.tx; maxTxDay = d; }
        if (d.tx >= 25) heatDays++;
      }
      if (d.tm !== null && d.tm !== undefined) {
        sumTm += d.tm; countTm++;
      }
      if (d.rr !== null && d.rr !== undefined) {
        sumRR += d.rr;
        if (d.rr >= 1.0) countRainDays++;
      }
      if (d.fxi !== null && d.fxi !== undefined) {
        if (maxGust === null || d.fxi > maxGust) {
          maxGust = d.fxi;
          maxGustDay = d;
        }
      }
    });

    const avgTn = countTn > 0 ? (sumTn / countTn).toFixed(1) : '-';
    const avgTx = countTx > 0 ? (sumTx / countTx).toFixed(1) : '-';
    const avgTm = countTm > 0 ? (sumTm / countTm).toFixed(1) : '-';

    return {
      avgTn, avgTx, avgTm,
      minTn: minTn !== null ? { val: minTn, day: minTnDay } : null,
      maxTx: maxTx !== null ? { val: maxTx, day: maxTxDay } : null,
      totalRR: sumRR.toFixed(1),
      countRainDays,
      frostDays,
      heatDays,
      maxGust: maxGust !== null ? { val: maxGust, day: maxGustDay } : null
    };
  }, [data]);

  const chartData = useMemo(() => {
    return data.map(d => {
      const dayNum = parseInt(d.date.split('-')[2], 10);
      return {
        day: `${dayNum}`,
        date: d.date,
        tn: d.tn,
        tx: d.tx,
        tm: d.tm,
        normTn: monthNormal?.tn || null,
        normTx: monthNormal?.tx || null,
        rr: d.rr,
        fxi: d.fxi
      };
    });
  }, [data, monthNormal]);

  const exportCSV = () => {
    if (!data || data.length === 0) return;
    const headers = ['Date', 'Tn (°C)', 'Heure Tn', 'Tx (°C)', 'Heure Tx', 'Tm (°C)', 'Pluie (mm)', 'Rafale OMM (km/h)', 'Heure Rafale', 'Dir (°)', 'Vent moyen (km/h)', 'Orage', 'Neige', 'Grêle', 'Gelée', 'Brouillard'];
    const rows = data.map(d => [
      d.date,
      d.tn ?? '', d.htn ?? '',
      d.tx ?? '', d.htx ?? '',
      d.tm ?? '', d.rr ?? '',
      d.fxi ?? '', d.hxi ?? '',
      d.dxi ?? '', d.ff ?? '',
      d.orag ? '1' : '0', d.neig ? '1' : '0', d.grele ? '1' : '0',
      d.gelee ? '1' : '0', d.brou ? '1' : '0'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('
');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `climatologie_${selectedStationId}_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Sélecteurs */}
      <div className="glass-card rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 bg-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Climatologie & Archives Historiques
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-bold">
                  1950 - Aujourd'hui
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Station active : <strong className="text-slate-900">{selectedStationName}</strong> ({selectedStationId})
              </p>
            </div>
          </div>
        </div>

        {/* Barres de contrôles */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-50 border border-sky-200 text-xs font-bold text-sky-800 hover:bg-sky-100 transition shadow-2xs"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-600" />
            <span>Station : {selectedStationName}</span>
          </button>

          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500 shadow-xs"
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500 shadow-xs"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-900 hover:border-sky-500 transition disabled:opacity-50 shadow-xs"
            title="Rafraîchir les données"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          <button
            onClick={exportCSV}
            disabled={!data || data.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-md shadow-sky-600/20 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Modal de recherche de station */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="glass-card rounded-2xl border border-slate-300 shadow-2xl w-full max-w-xl p-6 relative flex flex-col max-h-[85vh] bg-white">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Search className="w-5 h-5 text-sky-600" />
                Sélectionner une station Météo-France (2 400+ postes)
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 relative">
              <input
                type="text"
                placeholder="Rechercher par nom de commune, département ou indicatif..."
                value={stationSearch}
                onChange={e => setStationSearch(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
                autoFocus
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {filteredStations.map(st => (
                <button
                  key={st.id}
                  onClick={() => {
                    setSelectedStationId(st.id);
                    setSelectedStationName(st.name);
                    setIsModalOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition ${
                    selectedStationId === st.id
                      ? 'bg-sky-50 border-sky-400 text-sky-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <strong className="block text-xs font-bold text-slate-900">{st.name}</strong>
                    <span className="text-[11px] text-slate-500">
                      Département {st.dept || st.id.substring(0, 2)} • Alt : {st.alt} m
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-sky-700 bg-white px-2 py-1 rounded border border-slate-200">
                    {st.id}
                  </span>
                </button>
              ))}

              {filteredStations.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs font-medium">
                  Aucune station trouvée pour cette recherche.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message de chargement */}
      {loading && (
        <div className="glass-card rounded-2xl p-6 border border-sky-200 bg-sky-50/50 flex items-center justify-center gap-3 text-sky-800">
          <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
          <span className="text-sm font-bold">{progressMsg || 'Chargement des données officielles Météo-France…'}</span>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="glass-card rounded-2xl p-5 border border-rose-300 bg-rose-50 text-rose-800 flex items-center gap-3 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 Cartes KPI officielles */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-card rounded-2xl p-4 border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs uppercase font-bold">Tx Moyenne</span>
              <Sun className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600">{stats.avgTx}°C</div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Max : <strong>{stats.maxTx ? `${stats.maxTx.val}°C` : '-'}</strong> {stats.maxTx?.day && `(le ${stats.maxTx.day.date.split('-')[2]})`}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs uppercase font-bold">Tn Moyenne</span>
              <Thermometer className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-sky-700">{stats.avgTn}°C</div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Min : <strong>{stats.minTn ? `${stats.minTn.val}°C` : '-'}</strong> {stats.frostDays > 0 && `(${stats.frostDays} j de gel)`}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs uppercase font-bold">Tm Mensuelle</span>
              <span className="text-xs text-purple-700 font-mono font-bold">(Tn+Tx)/2</span>
            </div>
            <div className="text-2xl font-black text-purple-700">{stats.avgTm}°C</div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              {monthNormal?.tm ? `Normale 91-20 : ${monthNormal.tm}°C` : 'Moyenne 24h'}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs uppercase font-bold">Précipitations</span>
              <Droplets className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="text-2xl font-black text-cyan-700">{stats.totalRR} mm</div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              <strong>{stats.countRainDays}</strong> jours ≥ 1 mm
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs uppercase font-bold">Rafale Max</span>
              <Wind className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600">
              {stats.maxGust ? `${stats.maxGust.val} km/h` : '-'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              {stats.maxGust?.day ? `le ${stats.maxGust.day.date.split('-')[2]} à ${stats.maxGust.day.hxi || 'h.n.'}` : 'Norme OMM 3s'}
            </div>
          </div>
        </div>
      )}

      {/* Graphique Interactif Recharts */}
      {chartData.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              Évolution Quotidienne des Températures (°C) & Normales 1991-2020
            </h3>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="w-3 h-1 bg-amber-500 rounded-full inline-block"></span> Tx Max
              </span>
              <span className="flex items-center gap-1.5 text-sky-600">
                <span className="w-3 h-1 bg-sky-500 rounded-full inline-block"></span> Tn Min
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="°" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '0.75rem', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  formatter={(value, name) => [`${value}°C`, name === 'tx' ? 'Tx Maximale' : name === 'tn' ? 'Tn Minimale' : name]}
                  labelFormatter={(label) => `Jour ${label}`}
                />
                {monthNormal?.tx && (
                  <Line type="monotone" dataKey="normTx" stroke="#d97706" strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Normale Tx" />
                )}
                {monthNormal?.tn && (
                  <Line type="monotone" dataKey="normTn" stroke="#0284c7" strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Normale Tn" />
                )}
                <Area type="monotone" dataKey="tx" stroke="#f59e0b" fill="#fef3c7" fillOpacity={0.6} strokeWidth={2} name="tx" />
                <Area type="monotone" dataKey="tn" stroke="#0ea5e9" fill="#e0f2fe" fillOpacity={0.6} strokeWidth={2} name="tn" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tableau Quotidien Détaillé */}
      {data.length > 0 && (
        <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Relevés Quotidiens Officiels — {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </h3>
            <span className="text-xs text-slate-500 font-mono font-medium">{data.length} jours enregistrés</span>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-center">Tn (°C)</th>
                  <th className="p-3 text-center">Tx (°C)</th>
                  <th className="p-3 text-center">Tm (°C)</th>
                  <th className="p-3 text-center">Pluie (mm)</th>
                  <th className="p-3 text-center">Rafale Max</th>
                  <th className="p-3 text-center">Heure Rafale</th>
                  <th className="p-3 text-center">Direction</th>
                  <th className="p-3 text-center">Phénomènes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {data.map((d, i) => {
                  const dayNum = d.date.split('-')[2];
                  return (
                    <tr key={d.date} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-sans font-bold text-slate-900">
                        {dayNum}/{String(selectedMonth).padStart(2, '0')}
                      </td>
                      <td className={`p-3 text-center ${d.tn !== null && d.tn < 0 ? 'text-sky-700 font-bold' : 'text-slate-800'}`}>
                        {d.tn !== null ? `${d.tn}°` : '-'}
                        {d.htn && <span className="text-[10px] text-slate-400 font-sans block">{d.htn}</span>}
                      </td>
                      <td className={`p-3 text-center ${d.tx !== null && d.tx >= 25 ? 'text-amber-700 font-bold' : 'text-slate-800'}`}>
                        {d.tx !== null ? `${d.tx}°` : '-'}
                        {d.htx && <span className="text-[10px] text-slate-400 font-sans block">{d.htx}</span>}
                      </td>
                      <td className="p-3 text-center text-purple-700 font-semibold">
                        {d.tm !== null ? `${d.tm}°` : '-'}
                      </td>
                      <td className={`p-3 text-center ${d.rr > 0 ? 'text-cyan-700 font-bold' : 'text-slate-400'}`}>
                        {d.rr !== null ? `${d.rr}` : '-'}
                      </td>
                      <td className={`p-3 text-center ${d.fxi >= 60 ? 'text-rose-600 font-black' : 'text-slate-800'}`}>
                        {d.fxi !== null ? `${d.fxi} km/h` : '-'}
                      </td>
                      <td className="p-3 text-center text-slate-600 font-medium">
                        {d.hxi || '-'}
                      </td>
                      <td className="p-3 text-center text-slate-600">
                        {d.dxi ? `${d.dxi}°` : '-'}
                      </td>
                      <td className="p-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {d.orag && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold" title="Orage">⚡</span>}
                          {d.grele && <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold" title="Grêle">⚪</span>}
                          {d.neig && <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold" title="Neige">❄️</span>}
                          {d.gelee && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold" title="Gelée">🧊</span>}
                          {d.brou && <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold" title="Brouillard">🌫️</span>}
                          {!d.orag && !d.grele && !d.neig && !d.gelee && !d.brou && <span className="text-slate-300">-</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {stats && (
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td className="p-3 font-sans">Moyenne / Total</td>
                    <td className="p-3 text-center text-sky-700">{stats.avgTn}°C</td>
                    <td className="p-3 text-center text-amber-700">{stats.avgTx}°C</td>
                    <td className="p-3 text-center text-purple-700">{stats.avgTm}°C</td>
                    <td className="p-3 text-center text-cyan-700">{stats.totalRR} mm</td>
                    <td className="p-3 text-center text-rose-600">{stats.maxGust ? `${stats.maxGust.val} km/h` : '-'}</td>
                    <td colSpan={3} className="p-3 text-right font-sans text-xs text-slate-600 font-medium">
                      {stats.countRainDays} j pluie | {stats.frostDays} j gel
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
