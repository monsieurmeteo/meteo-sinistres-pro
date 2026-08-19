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

  // Déterminer la valeur max observée à proximité
  const validGusts = stations.map(s => s.obs?.fxi).filter(v => v !== null && v !== undefined);
  const maxProximityGust = validGusts.length > 0 ? Math.max(...validGusts) : null;

  const validRains = stations.map(s => s.obs?.rr).filter(v => v !== null && v !== undefined);
  const maxProximityRain = validRains.length > 0 ? Math.max(...validRains) : null;

  return (
    <div className="h-[460px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
      <MapContainer
        key={mapKey}
        center={center}
        zoom={10}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <MapResizer />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Marqueur du sinistre 🔴 avec badge permanent des valeurs à proximité */}
        <Marker position={center} icon={redIcon}>
          <Popup>
            <div className="text-slate-900 font-sans text-xs">
              <strong className="text-rose-600 block font-bold text-sm">🔴 Lieu du Sinistre</strong>
              <p className="mt-1 font-semibold">{sinistre.adresseSinistre || sinistre.commune}</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {sinistre.lat.toFixed(4)}°N, {sinistre.lon.toFixed(4)}°E
              </p>
              <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] space-y-0.5">
                {maxProximityGust !== null && (
                  <p className="text-rose-700 font-bold">💨 Rafale max mesurée à proximité : {maxProximityGust} km/h</p>
                )}
                {maxProximityRain !== null && (
                  <p className="text-sky-700 font-bold">🌧️ Pluie max mesurée à proximité : {maxProximityRain} mm</p>
                )}
              </div>
            </div>
          </Popup>
          <Tooltip permanent direction="top" offset={[0, -44]} className="custom-map-tooltip">
            <div className="bg-slate-900/95 text-white p-2 rounded-xl shadow-xl border border-rose-500/50 text-left font-sans text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-rose-400">
                <span>🔴 Lieu du Sinistre</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-200">
                {maxProximityGust !== null && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                    💨 {maxProximityGust} km/h
                  </span>
                )}
                {maxProximityRain !== null && (
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
                    🌧️ {maxProximityRain} mm
                  </span>
                )}
              </div>
            </div>
          </Tooltip>
        </Marker>

        {/* Marqueurs des 5 stations 🔵 + Valeurs affichées directement */}
        {stations.map((st, idx) => {
          if (!st.lat || !st.lon) return null;
          const stPos = [st.lat, st.lon];

          return (
            <React.Fragment key={st.id || idx}>
              <Marker position={stPos} icon={blueIcon}>
                <Popup>
                  <div className="text-slate-900 font-sans text-xs">
                    <strong className="text-sky-600 block font-bold text-sm">
                      🔵 Station #{idx + 1} : {st.name}
                    </strong>
                    <p className="mt-1">Indicatif Météo-France : <span className="font-mono font-bold">{st.id}</span></p>
                    <p>Distance au sinistre : <strong>{st.distance} km</strong></p>
                    <p>Altitude : {st.alt} m</p>
                    {st.obs && (
                      <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] space-y-0.5">
                        <p>🌧️ Pluie 24h : <strong>{st.obs.rr !== null && st.obs.rr !== undefined ? `${st.obs.rr} mm` : '-'}</strong></p>
                        <p>💨 Rafale max (OMM 3s) : <strong className="text-rose-600">{st.obs.fxi !== null && st.obs.fxi !== undefined ? `${st.obs.fxi} km/h` : 'Non équipé'}</strong> {st.obs.hxi && `(${st.obs.hxi})`}</p>
                        <p>🌡️ Températures : <strong>{st.obs.tn ?? '-'}°C / {st.obs.tx ?? '-'}°C</strong></p>
                      </div>
                    )}
                  </div>
                </Popup>

                {/* Badge Permanent sur chaque station */}
                <Tooltip permanent direction="bottom" offset={[0, 10]} className="custom-station-tooltip">
                  <div className="bg-slate-900/90 text-white px-2 py-1 rounded-lg border border-sky-500/40 text-center font-sans text-[10px] shadow-lg leading-tight">
                    <strong className="block text-sky-300 font-semibold truncate max-w-[110px]">
                      #{idx + 1} {st.name} ({st.distance} km)
                    </strong>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[9px] text-slate-300 font-mono">
                      {st.obs?.fxi !== null && st.obs?.fxi !== undefined && (
                        <span className="text-rose-400 font-bold">💨 {st.obs.fxi}k</span>
                      )}
                      {st.obs?.rr !== null && st.obs?.rr !== undefined && (
                        <span className="text-cyan-400">🌧️ {st.obs.rr}m</span>
                      )}
                      {st.obs?.tx !== null && st.obs?.tx !== undefined && (
                        <span className="text-amber-400">{st.obs.tx}°</span>
                      )}
                    </div>
                  </div>
                </Tooltip>
              </Marker>

              {/* Ligne géodésique pointillée */}
              <Polyline
                positions={[center, stPos]}
                pathOptions={{
                  color: '#0284c7',
                  weight: 2,
                  dashArray: '5, 7',
                  opacity: 0.75
                }}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Légende interactive flottante */}
      <div className="absolute bottom-3 right-3 z-[400] glass-card px-3.5 py-2 rounded-xl text-xs space-y-1 shadow-2xl border border-slate-700/80 bg-slate-950/90">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-sm"></span>
          <span className="text-slate-200 font-semibold">Lieu du sinistre & valeurs estimées</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-sky-500 inline-block shadow-sm"></span>
          <span className="text-slate-200">5 Stations Météo-France de référence</span>
        </div>
      </div>
    </div>
  );
}
