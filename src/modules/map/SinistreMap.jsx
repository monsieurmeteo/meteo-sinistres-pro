import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  popupAnchor: [1, -38],
  shadowSize: [46, 46]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [24, 40],
  iconAnchor: [12, 40],
  popupAnchor: [1, -34],
  shadowSize: [40, 40]
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export default function SinistreMap({ sinistre, stations = [] }) {
  if (!sinistre || typeof sinistre.lat !== 'number' || typeof sinistre.lon !== 'number') {
    return (
      <div className="h-80 rounded-2xl bg-slate-900/60 flex items-center justify-center border border-slate-800 text-slate-400 text-xs">
        Localisation du sinistre en attente de coordonnées géographiques
      </div>
    );
  }

  const center = [sinistre.lat, sinistre.lon];
  const mapKey = `${sinistre.lat.toFixed(4)}_${sinistre.lon.toFixed(4)}_${stations.length}`;

  const validGusts = stations.map(s => s.obs?.fxi).filter(v => v !== null && v !== undefined);
  const maxProximityGust = validGusts.length > 0 ? Math.max(...validGusts) : null;

  const validRains = stations.map(s => s.obs?.rr).filter(v => v !== null && v !== undefined);
  const maxProximityRain = validRains.length > 0 ? Math.max(...validRains) : null;

  return (
    <div id="sinistre-map-leaflet-container" className="h-[460px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
      <MapContainer
        key={mapKey}
        center={center}
        zoom={10}
        scrollWheelZoom={false}
        className="h-full w-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          crossOrigin="anonymous"
        />

        <MapResizer />

        {/* 🔴 Marqueur Sinistre avec Badge Permanent */}
        <Marker position={center} icon={redIcon}>
          <Tooltip permanent direction="top" offset={[0, -42]} opacity={0.95} className="custom-sinistre-tooltip">
            <div className="bg-slate-900 text-white p-2 rounded-xl border border-rose-500/50 shadow-2xl text-center min-w-[170px]">
              <div className="flex items-center justify-center gap-1 text-[11px] font-extrabold text-rose-400 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                Lieu du Sinistre
              </div>
              <div className="text-[10px] text-slate-300 font-medium truncate max-w-[160px] mt-0.5">
                {sinistre.adresseSinistre || sinistre.commune}
              </div>
              <div className="flex items-center justify-center gap-2 mt-1.5 pt-1.5 border-t border-slate-800 text-[10px]">
                {maxProximityGust !== null && (
                  <span className="font-extrabold text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded">
                    💨 {maxProximityGust} km/h
                  </span>
                )}
                {maxProximityRain !== null && (
                  <span className="font-extrabold text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded">
                    🌧️ {maxProximityRain} mm
                  </span>
                )}
              </div>
            </div>
          </Tooltip>

          <Popup>
            <div className="p-1 font-sans text-xs">
              <strong className="text-rose-700 block font-bold">Lieu du Sinistre</strong>
              <p className="text-slate-700 mt-1">{sinistre.adresseSinistre || sinistre.commune}</p>
              <p className="text-slate-500 font-mono text-[10px]">{sinistre.lat.toFixed(4)}°N, {sinistre.lon.toFixed(4)}°E</p>
            </div>
          </Popup>
        </Marker>

        {/* 🔵 Marqueurs des 5 Stations avec Badges Permanents */}
        {stations.map((st, idx) => {
          if (!st.lat || !st.lon) return null;
          const pos = [st.lat, st.lon];

          return (
            <React.Fragment key={st.id || idx}>
              <Polyline
                positions={[center, pos]}
                color="#0284c7"
                dashArray="6, 8"
                weight={2}
                opacity={0.7}
              />

              <Marker position={pos} icon={blueIcon}>
                <Tooltip permanent direction="bottom" offset={[0, 10]} opacity={0.92} className="custom-station-tooltip">
                  <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg border border-sky-500/40 shadow-xl text-center min-w-[140px]">
                    <div className="text-[10px] font-bold text-sky-300 truncate">
                      #{idx + 1} {st.name} ({st.distance} km)
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[9px] font-mono">
                      {st.obs?.fxi !== null && st.obs?.fxi !== undefined && (
                        <span className="text-rose-300 font-bold">💨 {st.obs.fxi}k</span>
                      )}
                      {st.obs?.rr !== null && st.obs?.rr !== undefined && (
                        <span className="text-cyan-300 font-bold">🌧️ {st.obs.rr}m</span>
                      )}
                      {st.obs?.tx !== null && st.obs?.tx !== undefined && (
                        <span className="text-amber-300 font-bold">{st.obs.tx}°</span>
                      )}
                    </div>
                  </div>
                </Tooltip>

                <Popup>
                  <div className="p-1 font-sans text-xs">
                    <strong className="text-sky-700 block font-bold">#{idx + 1} {st.name} ({st.id})</strong>
                    <p className="text-slate-600 mt-1">Distance : <span className="font-bold">{st.distance} km</span></p>
                    <p className="text-slate-600">Altitude : {st.alt} m</p>
                    {st.obs && (
                      <div className="mt-1 pt-1 border-t border-slate-200 font-mono text-[11px] space-y-0.5">
                        <p className="text-rose-600">Rafale Max : <strong>{st.obs.fxi ? `${st.obs.fxi} km/h` : '-'}</strong></p>
                        <p className="text-cyan-600">Pluie 24h : <strong>{st.obs.rr !== null ? `${st.obs.rr} mm` : '-'}</strong></p>
                        <p className="text-slate-700">Tn / Tx : {st.obs.tn}° / {st.obs.tx}°</p>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Légende interactive */}
      <div className="absolute bottom-3 right-3 z-20 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700 text-[11px] text-slate-300 shadow-xl space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
          <span>Lieu du sinistre & valeurs observées</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
          <span>5 Stations Météo-France de référence</span>
        </div>
      </div>
    </div>
  );
}
