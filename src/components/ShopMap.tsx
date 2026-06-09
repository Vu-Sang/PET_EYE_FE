import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { NearbyShopResponse, DirectionsResponse } from '../services/clinic.service';

// Goong Map types
declare global {
  interface Window {
    goongjs: any;
  }
}

// Map Key cho frontend (khác với API Key của backend)
const GOONG_MAP_KEY = import.meta.env.VITE_GOONG_MAP_API_KEY || 'Qu7Vly4VMWH8W5pYa8X1TCjzozBR21AY8PhcmQ2m';

interface ShopMapProps {
  userLocation: { lat: number; lng: number };
  nearbyShops: NearbyShopResponse[];
  currentShop?: { id: number; latitude: number; longitude: number; shopName: string };
  directions?: DirectionsResponse | null;
  onShopClick?: (shopId: number) => void;
}

export default function ShopMap({ 
  userLocation, 
  nearbyShops, 
  currentShop,
  directions,
  onShopClick 
}: ShopMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const markersRef = useRef<any[]>([]);

  // Load Goong Map script
  useEffect(() => {
    if (window.goongjs) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);

    const link = document.createElement('link');
    link.href = 'https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      script.remove();
      link.remove();
    };
  }, []);

  // Initialize map — only runs once when script is loaded
  const userLocRef = useRef(userLocation);
  userLocRef.current = userLocation;

  useEffect(() => {
    if (!scriptLoaded || !mapContainer.current || map.current) return;

    const goongjs = window.goongjs;
    goongjs.accessToken = GOONG_MAP_KEY;

    map.current = new goongjs.Map({
      container: mapContainer.current,
      style: 'https://tiles.goong.io/assets/goong_map_web.json',
      center: [userLocRef.current.lng, userLocRef.current.lat],
      zoom: 13,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      // Single resize after map is ready
      setTimeout(() => {
        if (map.current) map.current.resize();
      }, 300);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [scriptLoaded]);

  // Handle ResizeObserver — debounced to avoid excessive calls
  useEffect(() => {
    if (!mapLoaded || !map.current || !mapContainer.current) return;
    
    let resizeTimer: ReturnType<typeof setTimeout>;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (map.current) map.current.resize();
      }, 150);
    };
    
    // Single initial resize
    debouncedResize();

    const resizeObserver = new ResizeObserver(debouncedResize);
    resizeObserver.observe(mapContainer.current);
    
    return () => {
      resizeObserver.disconnect();
      clearTimeout(resizeTimer);
    };
  }, [mapLoaded]);

  // Update markers when shops change
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    const goongjs = window.goongjs;

    // Clear old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add user location marker
    const userMarker = new goongjs.Marker({ color: '#3b82f6' })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(
        new goongjs.Popup({ offset: 25 }).setHTML('<div class="font-bold">Vị trí của bạn</div>')
      )
      .addTo(map.current);
    markersRef.current.push(userMarker);

    // Add current shop marker (if viewing a specific shop)
    if (currentShop) {
      const el = document.createElement('div');
      el.className = 'shop-marker-current';
      el.innerHTML = '🏥';
      el.style.fontSize = '32px';
      el.style.cursor = 'pointer';

      const currentMarker = new goongjs.Marker(el)
        .setLngLat([currentShop.longitude, currentShop.latitude])
        .setPopup(
          new goongjs.Popup({ offset: 25 }).setHTML(
            `<div class="font-bold text-primary">${currentShop.shopName}</div>`
          )
        )
        .addTo(map.current);
      markersRef.current.push(currentMarker);
    }

    // Add nearby shops markers
    nearbyShops.forEach(shop => {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 40px; height: 40px; 
        background: linear-gradient(135deg, #10b981, #059669);
        border: 3px solid white;
        border-radius: 50%;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 14px rgba(16,185,129,0.45);
        font-size: 18px;
        transition: box-shadow 0.2s, border-color 0.2s;
      `;
      el.innerHTML = '🐾';
      el.onmouseenter = () => { el.style.boxShadow = '0 0 0 6px rgba(16,185,129,0.3), 0 4px 14px rgba(16,185,129,0.45)'; };
      el.onmouseleave = () => { el.style.boxShadow = '0 4px 14px rgba(16,185,129,0.45)'; };
      el.onclick = () => onShopClick?.(shop.id);

      const marker = new goongjs.Marker(el)
        .setLngLat([shop.longitude, shop.latitude])
        .setPopup(
          new goongjs.Popup({ offset: 25 }).setHTML(`
            <div style="padding:8px; min-width:160px;">
              <h3 style="font-weight:bold; font-size:14px; margin-bottom:4px;">${shop.shopName}</h3>
              <p style="font-size:12px; color:#64748b; margin-bottom:2px;">${shop.shopType}</p>
              <p style="font-size:12px;">📍 ${shop.distanceKm.toFixed(1)} km</p>
              <p style="font-size:12px;">⭐ ${shop.ratingAvg.toFixed(1)}</p>
            </div>
          `)
        )
        .addTo(map.current);
      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (nearbyShops.length > 0 || currentShop) {
      const bounds = new goongjs.LngLatBounds();
      bounds.extend([userLocation.lng, userLocation.lat]);
      
      if (currentShop) {
        bounds.extend([currentShop.longitude, currentShop.latitude]);
      }
      
      nearbyShops.forEach(shop => {
        bounds.extend([shop.longitude, shop.latitude]);
      });

      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [mapLoaded, nearbyShops, currentShop, userLocation, onShopClick]);

  // Draw route when directions available
  useEffect(() => {
    if (!mapLoaded || !map.current || !directions) return;

    const route = directions.routes[0];
    if (!route) return;

    console.log('Drawing route with polyline:', route.overview_polyline);

    try {
      // Decode polyline
      const polylineString = route.overview_polyline.points;
      const coordinates = decodePolyline(polylineString);

      console.log('Decoded coordinates:', coordinates.length, 'points');

      // Remove old route
      if (map.current.getSource('route')) {
        map.current.removeLayer('route');
        map.current.removeSource('route');
      }

      // Add route to map
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates,
          },
        },
      });

      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 5,
          'line-opacity': 0.75,
        },
      });

      // Fit bounds to route
      const goongjs = window.goongjs;
      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new goongjs.LngLatBounds(coordinates[0], coordinates[0]));

      map.current.fitBounds(bounds, { padding: 50 });
      
      console.log('✅ Route drawn successfully');
    } catch (error) {
      console.error('❌ Error drawing route:', error);
    }
  }, [mapLoaded, directions]);

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full rounded-2xl overflow-hidden shadow-lg"
    />
  );
}

// Decode polyline helper function
function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}
