import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as turf_ from "@turf/turf";
const turf = turf_ as any;
import { Moon, Sun, Compass, Car, Train, Plane, CloudRain, ThermometerSun, Loader2, Navigation, AlertTriangle, Sparkles, Maximize, Minimize, LocateFixed } from "lucide-react";

interface MapViewProps {
  fromStr: string;
  toStr: string;
  transport?: string;
  onTransportChange?: (t: string) => void;
  fullscreen?: boolean;
  onClose?: () => void;
  onExpand?: () => void;
}

const ORS_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM2MGUyMTJlYzVkNTRkMDc4MTQ0YmQ2NTU4Nzg4MTE4IiwiaCI6Im11cm11cjY0In0=";

// Elegant Cubic Easing for Progressive Animations
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const API_CACHE = new Map<string, any>();

// Custom Ship Icon mapping
const ShipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76" />
    <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
    <path d="M12 10v4" /><path d="M12 2v3" />
  </svg>
);

interface TransitSegment {
  id: string;
  mode: string;
  title: string;
  duration: string;
  coords: [number, number][];
  color: string;
}

interface TransportOption {
  id: string;
  icon: any;
  available: boolean;
  reason: string;
  cost?: number;
  recommended?: boolean;
}

export function MapComponent({ fromStr, toStr, transport = "Car", onTransportChange, fullscreen = false, onClose, onExpand }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const dotsRef = useRef<maplibregl.Marker[]>([]);
  const animRef = useRef<number | null>(null);
  const boundsRef = useRef<maplibregl.LngLatBounds | null>(null);

  const [segments, setSegments] = useState<TransitSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [is3D, setIs3D] = useState(false); 
  const [isLoading, setIsLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<{ temp: number, desc: string } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapWarning, setMapWarning] = useState<string | null>(null);
  const [ripples, setRipples] = useState<{ x: number, y: number, id: number }[]>([]);
  const [mapStats, setMapStats] = useState({ dist: 0, time: 0 });
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const [transportsOptions, setTransportsOptions] = useState<TransportOption[]>([
    { id: "Auto", icon: Navigation, available: true, reason: "" },
    { id: "Car", icon: Car, available: true, reason: "" },
    { id: "Ship", icon: ShipIcon, available: true, reason: "" },
    { id: "Flight", icon: Plane, available: true, reason: "" },
    { id: "Train", icon: Train, available: true, reason: "" }
  ]);

  // 1. Initialize Map Cinematic Entry
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [20, 30], 
      zoom: 1.5,
      pitch: 0, bearing: 0, 
      attributionControl: false
    } as any);

    mapRef.current.on('load', () => {
      mapRef.current?.easeTo({ zoom: 3, duration: 4000, easing: easeInOutCubic });
      setIsMapLoaded(true);
    });

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Keyboard listener for Fullscreen Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreen, onClose]);

  // Fullscreen Smart Frame Refit & Scale Adjustments
  useEffect(() => {
      if (fullscreen) {
         document.body.style.overflow = "hidden";
         document.querySelectorAll('.map-marker-node').forEach(m => m.classList.add('scale-[1.5]'));
      } else {
         document.body.style.overflow = "auto";
         document.querySelectorAll('.map-marker-node').forEach(m => m.classList.remove('scale-[1.5]'));
      }
      
      // Delay to let CSS transition finish expanding to screen width
      setTimeout(() => {
         if (mapRef.current && boundsRef.current) {
             mapRef.current.fitBounds(boundsRef.current, { padding: fullscreen ? 140 : 80, duration: 1500, maxZoom: 8 });
             mapRef.current.resize();
         }
      }, 500);
      
      return () => { document.body.style.overflow = "auto"; }
  }, [fullscreen]);

  // 2. Intelligence Transit Pipeline (with Debouncing)
  useEffect(() => {
    if (!mapRef.current || !fromStr || !toStr || !isMapLoaded) return;
    const map = mapRef.current;

    // EDGE CASE: Same Location Check
    if (fromStr.toLowerCase().trim() === toStr.toLowerCase().trim() && fromStr.trim() !== "") {
      setMapError("You are already at your destination");
      return;
    }
    setMapError(null);
    setMapWarning(null);

    let isSubscribed = true;

    const pipeline = async () => {
      setIsLoading(true);
      try {
        const cacheKey = `geo-${fromStr}-${toStr}`;
        let fData, tData, weather;
        
        if (API_CACHE.has(cacheKey)) {
            const cached = API_CACHE.get(cacheKey);
            fData = cached.fData; tData = cached.tData; weather = cached.weather;
        } else {
            const fRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fromStr)}`);
            const tRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(toStr)}`);
            fData = await fRes.json();
            tData = await tRes.json();
            
            if (fData?.length && tData?.length) {
                const tLon = parseFloat(tData[0].lon); const tLat = parseFloat(tData[0].lat);
                try {
                    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${tLat}&longitude=${tLon}&current_weather=true`);
                    weather = await wRes.json();
                } catch(e){}
                API_CACHE.set(cacheKey, { fData, tData, weather });
            }
        }

        if (!fData?.length || !tData?.length) {
          throw new Error("Location not found visually. Try modifying the string.");
        }

        const fCoord = [parseFloat(fData[0].lon), parseFloat(fData[0].lat)] as [number, number];
        const tCoord = [parseFloat(tData[0].lon), parseFloat(tData[0].lat)] as [number, number];

        if (isSubscribed && weather?.current_weather) {
            const code = weather.current_weather.weathercode;
            setWeatherData({ temp: Math.round(weather.current_weather.temperature), desc: code > 50 ? "Rainy" : code > 0 ? "Cloudy" : "Clear" });
        }

        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        const createMarker = (txt: string, col: string) => {
          const e = document.createElement('div');
          // map-marker-node is queried natively for scaling during fullscreen transitions
          e.className = `w-10 h-10 rounded-full border border-white/40 backdrop-blur-xl text-white font-extrabold flex items-center justify-center text-[13px] cursor-pointer transition-all duration-700 hover:z-50 shadow-[0_0_40px_${col}80] hover:shadow-[0_0_60px_${col}] animate-pulse group relative map-marker-node transform origin-center`;
          e.style.backgroundColor = col + 'AA';
          e.innerHTML = `
              <div class="absolute inset-0 rounded-full animate-ping opacity-20" style="background-color: ${col}"></div>
              <span class="drop-shadow-lg z-10 transition-transform duration-300 group-hover:scale-125">${txt}</span>
          `;
          return e;
        };

        const m1 = new maplibregl.Marker({ element: createMarker("A", "#fef08a") }).setLngLat(fCoord).setPopup(new maplibregl.Popup({ offset: 25, closeButton: false, className: "premium-popup" }).setHTML(`<div class="text-black font-bold text-sm px-3 py-1.5 rounded-lg">${fromStr}</div>`)).addTo(map);
        const m2 = new maplibregl.Marker({ element: createMarker("B", "#06b6d4") }).setLngLat(tCoord).setPopup(new maplibregl.Popup({ offset: 25, closeButton: false, className: "premium-popup" }).setHTML(`<div class="text-black font-bold text-sm px-3 py-1.5 rounded-lg">${toStr}</div>`)).addTo(map);
        markersRef.current.push(m1, m2);

        const totalDist = turf.distance(turf.point(fCoord), turf.point(tCoord));
        const isLocal = totalDist < 300;
        const isInternational = totalDist > 1500;

        const options: TransportOption[] = [
           { id: "Auto", icon: Navigation, available: true, reason: "", recommended: true },
           { id: "Car", icon: Car, available: !isInternational, reason: isInternational ? "Car not available for international routes" : "", cost: Math.round(totalDist * 12) },
           { id: "Ship", icon: ShipIcon, available: totalDist > 50, reason: totalDist <= 50 ? "Ship not available for local routes" : "", cost: Math.round(totalDist * 6) },
           { id: "Flight", icon: Plane, available: !isLocal, reason: isLocal ? "Flight not available for local routes" : "", cost: Math.round(totalDist * 18), recommended: !isLocal },
           { id: "Train", icon: Train, available: !isInternational, reason: isInternational ? "Train not available for international routes" : "", cost: Math.round(totalDist * 5), recommended: isLocal }
        ];

        if (isSubscribed) setTransportsOptions(options);

        let activeTransport = transport;
        const activeOption = options.find(o => o.id === activeTransport);
        
        if (activeOption && !activeOption.available) {
            const avail = options.filter(o => o.available && o.id !== "Auto").map(o => o.id).join(" or ");
            setMapWarning(`${activeTransport} is not available for this route. Please choose ${avail}.`);
            activeTransport = "Auto";
            if (onTransportChange) setTimeout(() => onTransportChange("Auto"), 2500);
        } else {
            setMapWarning(null);
        }

        if (activeTransport === "Auto") {
          if (totalDist > 800) activeTransport = "Flight";
          else if (totalDist > 300) activeTransport = "Train";
          else activeTransport = "Car";
        }

        let generatedSegments: TransitSegment[] = [];

        try {
          if (activeTransport === "Flight" || activeTransport === "Ship") {
            const isFlight = activeTransport === "Flight";
            const proxy1 = turf.destination(turf.point(fCoord), totalDist * (isFlight ? 0.1 : 0.05), turf.bearing(turf.point(fCoord), turf.point(tCoord))).geometry.coordinates as [number, number];
            const proxy2 = turf.destination(turf.point(tCoord), totalDist * (isFlight ? 0.1 : 0.05), turf.bearing(turf.point(tCoord), turf.point(fCoord))).geometry.coordinates as [number, number];

            const seg1 = turf.greatCircle(turf.point(fCoord), turf.point(proxy1), { steps: 30 }).geometry.coordinates as [number, number][];
            const segMid = turf.greatCircle(turf.point(proxy1), turf.point(proxy2), { steps: 100 }).geometry.coordinates as [number, number][];
            const seg3 = turf.greatCircle(turf.point(proxy2), turf.point(tCoord), { steps: 30 }).geometry.coordinates as [number, number][];

            if (isFlight) {
              generatedSegments = [
                { id: "S1", mode: "Car", title: "Taxi to Airport", duration: "0.5h", coords: seg1, color: "#22c55e" },
                { id: "S2", mode: "Flight", title: "Commercial Flight", duration: (totalDist / 800).toFixed(1) + "h", coords: segMid, color: "#a855f7" },
                { id: "S3", mode: "Train", title: "Express to City", duration: "0.3h", coords: seg3, color: "#f59e0b" }
              ];
            } else {
              generatedSegments = [
                { id: "S1", mode: "Car", title: "Drive to Port", duration: "1.2h", coords: seg1, color: "#22c55e" },
                { id: "S2", mode: "Ship", title: "Ocean Transit", duration: (totalDist / 40).toFixed(1) + "h", coords: segMid, color: "#00D1FF" },
                { id: "S3", mode: "Bus", title: "Bus Terminal", duration: "0.5h", coords: seg3, color: "#f59e0b" }
              ];
            }

            markersRef.current.push(
              new maplibregl.Marker({ element: createMarker(isFlight ? "✈" : "🚢", "#3b82f6") }).setLngLat(proxy1).addTo(map),
              new maplibregl.Marker({ element: createMarker(isFlight ? "🚆" : "🚌", "#3b82f6") }).setLngLat(proxy2).addTo(map)
            );
          } else {
            const profile = activeTransport === "Train" ? "driving-car" : "driving-car";
            const orsKey = `ors-${fCoord.join(',')}-${tCoord.join(',')}-${profile}`;
            let data;

            if (API_CACHE.has(orsKey)) {
                data = API_CACHE.get(orsKey);
            } else {
                const res = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}`, {
                  method: "POST", headers: { Authorization: ORS_KEY, "Content-Type": "application/json" },
                  body: JSON.stringify({ coordinates: [fCoord, tCoord] }),
                });
                if (!res.ok) throw new Error("ORS Failed oceanic crossing constraints");
                data = await res.json();
                API_CACHE.set(orsKey, data);
            }

            generatedSegments = [{
              id: "S1", mode: activeTransport, title: `${activeTransport} Direct`,
              duration: Math.floor(data.features[0].properties.segments[0].duration / 3600) + "h",
              coords: data.features[0].geometry.coordinates, color: "#06b6d4"
            }];
          }
        } catch (fallErr) {
          const midArc = turf.greatCircle(turf.point(fCoord), turf.point(tCoord), { steps: 100 }).geometry.coordinates as [number, number][];
          generatedSegments = [{ id: "S1", mode: "Flight", title: "Auto-Flight Diversion", duration: (totalDist / 800).toFixed(1) + "h", coords: midArc, color: "#a855f7" }];
        }

        if (!isSubscribed) return;
        setSegments(generatedSegments);

        // Calculate and Set Total Overview Stats for Fullscreen Panel
        const totalDurationHrs = generatedSegments.reduce((acc, seg) => acc + parseFloat(seg.duration.replace('h','')), 0);
        setMapStats({ dist: Math.round(totalDist), time: Math.round(totalDurationHrs * 10) / 10 });

        ["S1", "S2", "S3"].forEach(id => {
          if (map.getSource(`src-${id}`)) {
            map.removeLayer(`line-${id}`);
            map.removeLayer(`glow-${id}`);
            map.removeSource(`src-${id}`);
          }
        });
        dotsRef.current.forEach(d => d.remove());
        dotsRef.current = [];

        const bounds = new maplibregl.LngLatBounds();
        bounds.extend(fCoord); bounds.extend(tCoord);
        boundsRef.current = bounds; 

        generatedSegments.forEach((seg, i) => {
          seg.coords.forEach(c => bounds.extend(c as [number, number]));

          map.addSource(`src-${seg.id}`, {
            type: "geojson",
            lineMetrics: true,
            data: { type: "Feature", geometry: { type: "LineString", coordinates: [seg.coords[0]] }, properties: {} }
          });

          map.addLayer({
            id: `glow-${seg.id}`, type: "line", source: `src-${seg.id}`,
            paint: { "line-color": seg.color, "line-width": 18, "line-blur": 8, "line-opacity": 0.4 }
          });

          const isDashed = seg.mode === "Train" || seg.mode === "Bus";

          const paintProps: any = {
               "line-width": 5,
          };
          if (isDashed) {
               paintProps["line-color"] = seg.color;
               paintProps["line-dasharray"] = [3, 2];
          } else {
               paintProps["line-gradient"] = [
                   "interpolate", ["linear"], ["line-progress"],
                   0, "#fef08a",
                   0.5, "#3b82f6",
                   1, seg.mode === "Ship" ? "#00D1FF" : seg.color
               ];
          }

          map.addLayer({
            id: `line-${seg.id}`, type: "line", source: `src-${seg.id}`,
            paint: paintProps
          });

          const customDot = document.createElement('div');
          const innerScaler = document.createElement('div');
          innerScaler.className = "marker-scaler w-full h-full flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]";
          innerScaler.style.transform = fullscreen ? "scale(1.5)" : "scale(1)";
          
          let innerHTML = '';
          if (seg.mode === "Ship") {
              innerHTML = `
                 <div class="absolute inset-0 bg-[#00D1FF] rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50 relative"></div>
                 <div class="absolute inset-0 bg-[#00D1FF] rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30 delay-150 mix-blend-screen absolute"></div>
                 <div class="absolute inset-0 flex items-center justify-center animate-[bounce_3s_ease-in-out_infinite] z-10"><span class="drop-shadow-[0_0_8px_#fff] text-[16px]">🚢</span></div>
              `;
              customDot.className = `w-1 h-1 flex items-center justify-center -translate-x-1/2 -translate-y-1/2`;
          } else if (seg.mode === "Flight") {
              customDot.className = `w-5 h-5 rounded-full border-[3px] absolute border-purple-500 bg-white shadow-[0_0_20px_#a855f7] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-xs text-purple-600`;
              innerHTML = `✈`;
          } else {
              customDot.className = `w-4 h-4 rounded-full border-[3px] absolute border-green-500 bg-white shadow-[0_0_15px_#22c55e] -translate-x-1/2 -translate-y-1/2`;
          }
          innerScaler.innerHTML = innerHTML;
          customDot.appendChild(innerScaler);

          const dMark = new maplibregl.Marker({ element: customDot, offset: [0, 0] }).setLngLat(seg.coords[0]).addTo(map);
          dotsRef.current.push(dMark);
        });

        // Smart Cinematic Bounds Fitting
        setTimeout(() => {
           map.fitBounds(bounds, { padding: fullscreen ? 120 : 60, duration: fullscreen ? 1500 : 2500, maxZoom: 9, pitch: map.getPitch() });
        }, 100);

        if (animRef.current) cancelAnimationFrame(animRef.current);

        let startT = performance.now();
        const duration = 4000; 

        const animateAll = (now: number) => {
          let t = (now - startT) / duration;
          if (t > 1) t = 1;
          const progress = easeInOutCubic(t);

          generatedSegments.forEach((seg, idx) => {
            const cutIndex = Math.floor(progress * seg.coords.length);
            const src = map.getSource(`src-${seg.id}`) as maplibregl.GeoJSONSource;
            if (src && cutIndex > 0) {
              const pCoords = seg.coords.slice(0, cutIndex + 1);
              src.setData({ type: "Feature", geometry: { type: "LineString", coordinates: pCoords }, properties: {} });
              if (dotsRef.current[idx]) {
                dotsRef.current[idx].setLngLat(seg.coords[Math.min(cutIndex, seg.coords.length - 1)]);
              }
            }
          });

          if (t < 1) {
             animRef.current = requestAnimationFrame(animateAll);
          } else {
             // Gentle orbit when idle
             map.easeTo({ bearing: map.getBearing() + 15, duration: 15000, easing: t=>t });
          }
        };

        setTimeout(() => { animRef.current = requestAnimationFrame(animateAll); }, 1800);

      } catch (err: any) {
        setMapError(err.message || "Failed to calculate navigation parameters");
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(() => pipeline(), 600);
    return () => { isSubscribed = false; clearTimeout(timeoutId); };
  }, [fromStr, toStr, transport, isMapLoaded]);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    segments.forEach(seg => {
      if (mapRef.current!.getLayer(`line-${seg.id}`)) {
        mapRef.current!.setPaintProperty(`line-${seg.id}`, 'line-opacity', activeSegmentId === null || activeSegmentId === seg.id ? 1 : 0.2);
        mapRef.current!.setPaintProperty(`glow-${seg.id}`, 'line-opacity', activeSegmentId === null || activeSegmentId === seg.id ? 0.35 : 0.0);
      }
    });
  }, [activeSegmentId, segments]);

  const toggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDark(!isDark);
    mapRef.current?.setStyle(!isDark ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json");
  };

  const toggleTilt = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIs3D(!is3D);
    mapRef.current?.easeTo({ pitch: !is3D ? 45 : 0, duration: 1200, easing: easeInOutCubic });
  };
  
  // 🎯 7. BIGGER MARKERS IN FULLSCREEN
  useEffect(() => {
    dotsRef.current.forEach(marker => {
      const scaler = marker.getElement().querySelector('.marker-scaler') as HTMLElement;
      if (scaler) scaler.style.transform = fullscreen ? "scale(1.5)" : "scale(1)";
    });
  }, [fullscreen]);

  const resetFocus = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (mapRef.current && boundsRef.current) {
          mapRef.current.fitBounds(boundsRef.current, { padding: fullscreen ? 140 : 80, duration: 1500, maxZoom: 9, pitch: is3D ? 45 : 0, bearing: 0 });
      }
  };

  // 🎯 11. PREVENT SCROLL
  useEffect(() => {
    if (fullscreen) {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = "auto"; };
    }
  }, [fullscreen]);

  const handleContainerClick = (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      setRipples(r => [...r, {x, y, id}]);
      setTimeout(() => setRipples(r => r.filter(rip => rip.id !== id)), 1000);
      
      if (!fullscreen && onExpand && (e.target as HTMLElement).tagName === "CANVAS") {
          onExpand();
      }
  };

  return (
    <div className={`relative w-full h-full font-display bg-black overflow-hidden ${fullscreen ? "rounded-none" : "rounded-inherit"}`}>
      
      {/* Ghost Anchor Element internally preserving layout height while fullscreen lifts it out of the node tree */}
      {fullscreen && <div className="absolute inset-0 z-[10] w-full h-full pointer-events-none" onClick={onClose} />}
      
      {/* The Animated Bounding Box Container */}
      <div 
         onClick={handleContainerClick}
         className={`relative w-full h-full transition-all duration-500 ease-out ${!fullscreen ? "hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(0,209,255,0.15)]" : ""}`}
      >
        <div ref={mapContainer} style={{ width: "100%", height: "100%" }} className="transition-opacity duration-1000" />

        {/* Dynamic Click Ripples Simulation */}
        {ripples.map(r => (
            <div key={r.id} className="absolute w-20 h-20 bg-white/20 rounded-full animate-[ping_0.8s_ease-out_forwards] pointer-events-none" style={{left: r.x - 40, top: r.y - 40}} />
        ))}

        {mapError && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-40 transition-opacity">
            <div className="bg-red-500/10 border border-red-500/20 px-8 py-6 rounded-3xl flex flex-col items-center gap-4 text-center shadow-2xl">
              <AlertTriangle className="w-12 h-12 text-red-500 animate-pulse" />
              <h3 className="text-2xl font-black text-white">Navigation Interrupted</h3>
              <p className="text-red-300 font-medium max-w-sm text-sm">{mapError}</p>
            </div>
          </div>
        )}

        {mapWarning && !mapError && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 animate-[slideDown_0.5s_ease-out]">
            <div className="bg-red-500/90 backdrop-blur-xl border border-red-300/50 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-[0_10px_40px_rgba(239,68,68,0.5)]">
               <AlertTriangle className="w-5 h-5 text-white" />
               <p className="text-white font-semibold text-sm drop-shadow-md">{mapWarning}</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30 transition-opacity duration-500 pointer-events-none opacity-100">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-[200%] animate-[shimmer_2s_infinite]" />
            <div className="bg-black/80 border border-white/10 px-8 py-5 rounded-3xl flex flex-col items-center gap-4 shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00D1FF] to-transparent animate-[shimmer_1.5s_infinite]" />
              <Loader2 className="w-8 h-8 text-[#00D1FF] animate-spin" />
              <span className="text-white font-bold tracking-wide text-xs animate-pulse text-white/80">Calculating Optimal Architecture...</span>
            </div>
          </div>
        )}

        {/* Top-Left Weather Layout */}
        <div className={`absolute left-6 z-20 pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${fullscreen ? "top-10 scale-[1.15] origin-top-left" : "top-6 hover:scale-105"}`}>
          <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 flex flex-col gap-1 shadow-2xl transition-opacity">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-[#00D1FF]/40 to-blue-500/20 p-2 rounded-xl ring-1 ring-white/10">
                <CloudRain className="w-4 h-4 text-[#00D1FF]" />
              </div>
              <div>
                <p className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">{toStr || "Destination"}</p>
                <p className="text-white text-base flex items-center gap-2 font-bold mt-0.5">
                  {weatherData ? `${weatherData.temp}°C ` : <Loader2 className="w-3 h-3 animate-spin" />}
                  <span className="h-4 w-[1px] bg-white/20 mx-1"></span>
                  <span className="text-xs font-medium text-white/80 flex items-center gap-1.5"><ThermometerSun className="w-3 h-3 text-yellow-400" /> {weatherData?.desc || "API"}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Total Stats Panel requested explicitly by user */}
        {fullscreen && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 backdrop-blur-xl bg-white/10 px-6 py-3 rounded-xl shadow-lg animate-fadeIn z-30 pointer-events-none">
            <p className="text-white font-semibold text-sm">Distance: <span className="font-black text-cyan-400">{mapStats.dist.toLocaleString()}</span> km</p>
            <p className="text-white font-semibold text-sm mt-1">Time: <span className="font-black text-cyan-400">{mapStats.time}</span> hrs</p>
          </div>
        )}

        {/* Ultra-Premium Controls Panel (Right aligned) -> Expanded in Fullscreen */}
        <div className={`absolute right-6 flex flex-col gap-3 z-20 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${fullscreen ? "top-10 scale-100 origin-top-right w-44" : "top-6 w-10"}`}>
          
          <div className="flex flex-col bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl overflow-hidden">
            <button onClick={(e) => { e.stopPropagation(); fullscreen ? onClose?.() : onExpand?.(); }} className={`flex items-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all ${fullscreen ? "h-11 px-3 gap-3" : "w-8 h-8 justify-center"}`} title="Toggle Fullscreen">
              {fullscreen ? <Minimize className="w-4 h-4 shrink-0 text-cyan-400" /> : <Maximize className="w-3.5 h-3.5 shrink-0" />}
              {fullscreen && <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Collapse</span>}
            </button>
            <div className="w-full h-[1px] bg-white/10 my-0.5" />
            <button onClick={toggleTheme} className={`flex items-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all ${fullscreen ? "h-11 px-3 gap-3" : "w-8 h-8 justify-center"}`} title="Toggle Colors">
              {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0 text-yellow-400" />}
              {fullscreen && <span className="text-[11px] font-extrabold uppercase tracking-widest whitespace-nowrap">Theme</span>}
            </button>
            <div className="w-full h-[1px] bg-white/10 my-0.5" />
            <button onClick={toggleTilt} className={`flex items-center rounded-lg transition-all ${is3D ? "text-[#00D1FF] bg-white/10 shadow-[0_0_15px_rgba(0,209,255,0.2)]" : "text-white/80 hover:text-white hover:bg-white/10"} ${fullscreen ? "h-11 px-3 gap-3" : "w-8 h-8 justify-center"}`} title="Toggle 3D">
              <Compass className="w-4 h-4 shrink-0" />
              {fullscreen && <span className="text-[11px] font-extrabold uppercase tracking-widest whitespace-nowrap">3D View</span>}
            </button>
            <div className="w-full h-[1px] bg-white/10 my-0.5" />
            <button onClick={resetFocus} className={`flex items-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all ${fullscreen ? "h-11 px-3 gap-3" : "w-8 h-8 justify-center"}`} title="Recenter Route">
              <LocateFixed className="w-4 h-4 shrink-0" />
              {fullscreen && <span className="text-[11px] font-extrabold uppercase tracking-widest whitespace-nowrap">Recenter</span>}
            </button>
          </div>

          {onTransportChange && (
            <div className="flex flex-col bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl relative">
              {transportsOptions.map(t => {
                const IconComp = t.icon;
                const isActive = transport === t.id;
                return (
                   <button key={t.id} onClick={(e) => { e.stopPropagation(); if(t.available) onTransportChange(t.id); }} disabled={!t.available}
                    className={`flex items-center rounded-lg transition-all duration-300 relative group/btn overflow-hidden
                      ${isActive ? "bg-gradient-to-tr from-white/20 to-white/5 text-white ring-1 ring-cyan-400 shadow-[0_0_15px_rgba(0,209,255,0.3)] hover:scale-[1.02]" : "text-white/60 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:scale-[1.02]"} 
                      ${!t.available ? "opacity-20 grayscale cursor-not-allowed hover:bg-transparent hover:scale-100 hover:shadow-none bg-transparent" : "cursor-pointer"}
                      ${fullscreen ? "h-12 px-3 gap-3" : "w-8 h-8 justify-center"}
                    `}>
                    <IconComp className="w-4 h-4 shrink-0" />
                    
                    {fullscreen && (
                       <span className="text-[11px] font-bold uppercase tracking-widest flex-1 text-left">{t.id}</span>
                    )}

                    {t.recommended && (
                       <div className="absolute top-1 right-1 z-10">
                          <Sparkles className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,1)] animate-pulse" />
                       </div>
                    )}

                     <div className="absolute right-[110%] mr-1 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-xl px-3 py-2 rounded-lg text-xs font-semibold opacity-0 group-hover/btn:opacity-100 transition-opacity ring-1 ring-white/10 shadow-2xl pointer-events-none flex flex-col items-end gap-1 min-w-max">
                       <span className="text-white text-[11px] uppercase tracking-wider">{t.id}</span>
                       {t.available ? (
                          <>
                             {t.cost && <span className="text-green-400 font-extrabold text-[10px]">₹ {t.cost.toLocaleString()}</span>}
                          </>
                       ) : (
                          <span className="text-red-400 font-bold max-w-[120px] text-right text-[9px] leading-tight mt-0.5 bg-red-500/10 p-1 rounded">Not available for this route</span>
                       )}
                    </div>
                  </button>
                );
              })}
              
              {/* Premium Mini AI Panel dynamically attached below the array */}
              <div className="absolute top-[105%] right-0 p-3 bg-gradient-to-br from-black/80 to-black/40 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl flex flex-col gap-1.5 ring-1 ring-white/5 w-full">
                 <div className="flex items-center justify-end gap-1 mb-0.5">
                     <span className="text-blue-300 text-[8px] uppercase font-black tracking-[0.2em] relative">AI Decision <Sparkles className="w-2 h-2 text-blue-400 absolute -left-4 top-0 animate-pulse" /></span>
                 </div>
                 <p className="text-white/90 text-[10px] font-bold text-right tracking-wide">Best: <span className="text-yellow-400">{transportsOptions.find(o => o.recommended && o.id !== "Auto")?.id || "Flight"}</span></p>
                 <p className="text-white/50 text-[9px] font-bold text-right tracking-wide">Alt: <span className="text-white/80">{transportsOptions.filter(o => o.available && o.id !== "Auto").sort((a,b) => (a.cost||0) - (b.cost||0))[0]?.id || "Ship"}</span></p>
              </div>
            </div>
          )}
        </div>

        {/* Multi-Step HUD Navigation Arrays */}
        {segments.length > 0 && (
          <div className={`absolute left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-2xl px-5 py-2.5 rounded-2xl border border-white/10 flex items-center gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-20 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${fullscreen ? "bottom-12 scale-[1.2]" : "bottom-8"}`}>
            {segments.map((seg, i) => (
              <React.Fragment key={seg.id}>
                <div
                  onMouseEnter={() => setActiveSegmentId(seg.id)}
                  onMouseLeave={() => setActiveSegmentId(null)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer border ${activeSegmentId === seg.id ? "bg-white/10 border-white/30 scale-[1.05] shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "bg-transparent border-transparent hover:bg-white/5"}`}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: seg.color + '22', color: seg.color, border: `1px solid ${seg.color}55` }}>
                    {seg.mode === "Car" && <Car className="w-3 h-3" />}
                    {seg.mode === "Flight" && <Plane className="w-3 h-3" />}
                    {seg.mode === "Ship" && <div className="scale-75"><ShipIcon /></div>}
                    {seg.mode === "Train" && <Train className="w-3 h-3" />}
                    {seg.mode === "Bus" && <Train className="w-3 h-3 opacity-80" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white text-[10px] font-extrabold tracking-wide" style={{ color: activeSegmentId === seg.id ? '#fff' : seg.color }}>{seg.title}</span>
                    <span className="text-white/40 text-[9px] uppercase font-black tracking-widest">{seg.duration}</span>
                  </div>
                </div>
                {i !== segments.length - 1 && <div className="text-white/20 text-xs font-light">›</div>}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 🎯 3. FULLSCREEN OVERLAY COMPONENT
function FullscreenMap({ onClose, props }: { onClose: () => void, props: MapViewProps }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* BACKDROP */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-xl animate-fadeIn"
      />
      {/* MAP CONTAINER */}
      <div className="absolute inset-0 flex items-center justify-center p-6 lg:p-10 pointer-events-none">
        <div className="w-full h-full max-w-7xl animate-mapExpand rounded-[2rem] shadow-2xl overflow-hidden pointer-events-auto border border-white/10">
          <MapComponent {...props} fullscreen={true} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

// 🎯 2. MAP WRAPPER STRUCTURE
export default function MapView(props: MapViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="relative w-full h-full">
      <div className="w-full h-full cursor-zoom-in">
         <MapComponent {...props} fullscreen={false} onExpand={() => setIsFullscreen(true)} />
      </div>

      {isFullscreen && createPortal(
         <FullscreenMap onClose={() => setIsFullscreen(false)} props={props} />,
         document.body
      )}
    </div>
  );
}
