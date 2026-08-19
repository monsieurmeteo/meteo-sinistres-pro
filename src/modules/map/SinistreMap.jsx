import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [26, 42],
  iconAnchor: [13, 42],
  popupAnchor: [1, -36],
  shadowSize: [42, 42]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [22, 36],
  iconAnchor: [11, 36],
  popupAnchor: [1, -32],
  shadowSize: [36, 36]
});

function AutoFitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 12 });
      setTimeout(() => map.invalidateSize(), 200);
    }
  }, [map, points]);
  return null;
}

export default function SinistreMap({ sinistre, stations = [] }) {
  if (!sinistre || typeof sinistre.lat !== 'number' || typeof sinistre.lon !== 'number') {
    return (
      <div className="h-64 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-300 text-slate-500 text-xs">
        Localisation du sinistre en attente de coordonnées géographiques
      </div>
    );
  }

  const center = [sinistre.lat, sinistre.lon];
  const activeStations = stations.slice(0, 3);
  
  const allPoints = [
    center,
    ...activeStations.filter(s => typeof s.lat === 'number' && typeof s.lon === 'number').map(s => [s.lat, s.lon])
  ];

  const mapKey = `${sinistre.lat.toFixed(4)}_${sinistre.lon.toFixed(4)}_${activeStations.length}`;

  return (
    <div className="w-full space-y-2">
      {/* Conteneur Carte au ratio strict 16:9 / 3:2 */}
      <div 
        id="sinistre-map-leaflet-container" 
        className="w-full aspect-[16/9] max-h-[380px] rounded-xl overflow-hidden border border-slate-300 shadow-sm relative bg-slate-100"
      >
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

          <AutoFitBounds points={allPoints} />

          {/* 🔴 Marqueur Sinistre avec label sobre */}
          <Marker position={center} icon={redIcon}>
            <Tooltip permanent direction="top" offset={[0, -38]} opacity={0.95}>
              <span className="font-extrabold text-[11px] text-rose-800 bg-white px-2 py-0.5 rounded shadow border border-rose-400">
                🔴 LIEU DU SINISTRE
              </span>
            </Tooltip>
          </Marker>

          {/* 🔵 Marqueurs des 3 Stations */}
          {activeStations.map((st, idx) => {
            if (!st.lat || !st.lon) return null;
            return (
              <React.Fragment key={st.id || idx}>
                <Marker position={[st.lat, st.lon]} icon={blueIcon}>
                  <Tooltip permanent direction="top" offset={[0, -32]} opacity={0.95}>
                    <span className="font-bold text-[10px] text-sky-950 bg-white px-2 py-0.5 rounded shadow border border-sky-400">
                      🔵 {idx + 1} - {st.name} ({st.distance} km)
                    </span>
                  </Tooltip>
                </Marker>

                <Polyline
                  positions={[center, [st.lat, st.lon]]}
                  pathOptions={{
                    color: '#0284c7',
                    weight: 2,
                    dashArray: '4, 6',
                    opacity: 0.7
                  }}
                />
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      {/* Légende extérieure sobre sous la carte */}
      <div className="flex flex-wrap items-center justify-between px-2 text-xs text-slate-700 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
          <strong>Lieu du sinistre :</strong> {sinistre.adresseSinistre || sinistre.commune}
        </span>
        <span className="text-slate-600 font-mono text-[11px]">
          Stations de référence : {activeStations.map((s, i) => `${i+1}. ${s.name} (${s.distance} km)`).join(' • ')}
        </span>
      </div>
    </div>
  );
}
