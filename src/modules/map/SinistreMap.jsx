import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix pour les icones Leaflet par défaut
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function SinistreMap({ sinistre, stations = [] }) {
  if (!sinistre || !sinistre.lat || !sinistre.lon) {
    return (
      <div className="h-96 rounded-2xl bg-slate-900/60 flex items-center justify-center border border-slate-800 text-slate-400">
        Coordonnées du sinistre non disponibles pour la carte
      </div>
    );
  }

  const center = [sinistre.lat, sinistre.lon];

  return (
    <div className="h-[420px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
      <MapContainer
        center={center}
        zoom={10}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Marqueur du sinistre 🔴 */}
        <Marker position={center} icon={redIcon}>
          <Popup>
            <div className="text-slate-900 font-sans text-xs">
              <strong className="text-rose-600 block font-bold text-sm">🔴 Lieu du Sinistre</strong>
              <p className="mt-1">{sinistre.adresseSinistre || sinistre.commune}</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {sinistre.lat.toFixed(4)}°N, {sinistre.lon.toFixed(4)}°E
              </p>
            </div>
          </Popup>
          <Tooltip permanent direction="top" offset={[0, -40]}>
            <span className="font-semibold text-rose-600">🔴 Sinistre</span>
          </Tooltip>
        </Marker>

        {/* Marqueurs des 3 stations 🔵 + Lignes de liaison */}
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
                    <p className="mt-1">Indicatif : <span className="font-mono">{st.id}</span></p>
                    <p>Distance au sinistre : <strong>{st.distance} km</strong></p>
                    <p>Altitude : {st.alt} m</p>
                    {st.obs && (
                      <div className="mt-2 pt-2 border-t border-slate-200 text-[11px]">
                        <p>🌧️ Pluie : <strong>{st.obs.rr ?? '-'} mm</strong></p>
                        <p>💨 Rafale max : <strong>{st.obs.fxi ?? '-'} km/h</strong> {st.obs.hxi && `(${st.obs.hxi})`}</p>
                        <p>🌡️ Température : <strong>{st.obs.tn ?? '-'}° / {st.obs.tx ?? '-'}°</strong></p>
                      </div>
                    )}
                  </div>
                </Popup>
                <Tooltip direction="top" offset={[0, -40]}>
                  <span className="font-medium">#{idx + 1} {st.name} ({st.distance} km)</span>
                </Tooltip>
              </Marker>

              {/* Ligne pointillée géodésique */}
              <Polyline
                positions={[center, stPos]}
                pathOptions={{
                  color: '#0284c7',
                  weight: 2,
                  dashArray: '6, 8',
                  opacity: 0.8
                }}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Légende flottante */}
      <div className="absolute bottom-4 right-4 z-[400] glass-card px-3 py-2 rounded-xl text-xs space-y-1 shadow-lg border border-slate-700/80">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
          <span className="text-slate-200">Lieu déclaré du sinistre</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-sky-500 inline-block"></span>
          <span className="text-slate-200">3 Stations Météo-France retenues</span>
        </div>
      </div>
    </div>
  );
}
