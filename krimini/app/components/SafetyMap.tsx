/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useRef, useState } from 'react';
import { Incident, Severity } from '../types';

declare const google: any;

const MAP_STYLES = [
  { "elementType": "geometry", "stylers": [{ "color": "#1d2c4d" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a3646" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#283d6a" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#304a7d" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0e1626" }] }
];

interface SafetyMapProps {
  incidents: Incident[];
  userLocation: [number, number];
  filterHours: number;
  onFilterChange: (hours: number) => void;
}

const SafetyMap: React.FC<SafetyMapProps> = ({ incidents, userLocation, filterHours, onFilterChange }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load Google Maps API Script
  useEffect(() => {
    // Cast window to any to check for google property and avoid TS error
    if ((window as any).google) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.API_KEY}&libraries=places&v=beta`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: userLocation[0], lng: userLocation[1] },
      zoom: 16,
      styles: MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      backgroundColor: '#0f172a',
    });
  }, [isLoaded]);

  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    markersRef.current.forEach(m => m.setMap(null));
    circlesRef.current.forEach(c => c.setMap(null));
    markersRef.current = [];
    circlesRef.current = [];

    // User marker
    const userMarker = new google.maps.Marker({
      position: { lat: userLocation[0], lng: userLocation[1] },
      map: mapInstanceRef.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#6366f1',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 8,
      }
    });
    markersRef.current.push(userMarker);

    // Plot Incidents
    incidents.forEach(inc => {
      const color = inc.isVerifiedResource ? '#a855f7' : 
                   inc.severity === Severity.CRITICAL ? '#ef4444' : 
                   inc.severity === Severity.HIGH ? '#f97316' : '#10b981';
      
      const marker = new google.maps.Marker({
        position: { lat: inc.location[0], lng: inc.location[1] },
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: '#0f172a',
          strokeWeight: 2,
          scale: inc.severity === Severity.CRITICAL ? 11 : 7,
        }
      });

      const circle = new google.maps.Circle({
        strokeColor: color,
        strokeOpacity: 0.3,
        strokeWeight: 1,
        fillColor: color,
        fillOpacity: 0.1,
        map: mapInstanceRef.current,
        center: { lat: inc.location[0], lng: inc.location[1] },
        radius: inc.severity === Severity.CRITICAL ? 150 : 80,
      });

      const info = new google.maps.InfoWindow({
        content: `
          <div style="padding:12px; color:white; font-size:12px;">
            <b style="color:${color}">${inc.type}</b><br/>
            <small>${inc.locationName}</small><br/>
            <p style="margin-top:4px">${inc.description}</p>
            ${inc.uri ? `<a href="${inc.uri}" target="_blank" style="color:#6366f1; font-weight:bold;">VIEW ON MAPS</a>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => info.open(mapInstanceRef.current, marker));
      markersRef.current.push(marker);
      circlesRef.current.push(circle);
    });
  }, [incidents, userLocation, isLoaded]);

  return (
    <div className="h-full w-full relative">
      <div ref={mapRef} className="h-full w-full" />
      <div className="absolute top-4 right-4 z-10 space-y-2">
        <div className="glass-morphism p-3 rounded-lg w-44">
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2">
            <span>HORIZON</span>
            <span className="text-indigo-400">{filterHours}H</span>
          </div>
          <input 
            type="range" min="1" max="48" value={filterHours} 
            onChange={(e) => onFilterChange(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
        <div className="glass-morphism p-3 rounded-lg text-[10px] space-y-1">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Critical</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Verified Safety Resource</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Stable</div>
        </div>
      </div>
    </div>
  );
};

export default SafetyMap;
