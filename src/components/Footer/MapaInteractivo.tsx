'use client';

import React, { useEffect, useRef } from 'react';

interface MapaInteractivoProps {
    lat: number;
    lng: number;
    zoom?: number;
}

const MapaInteractivo: React.FC<MapaInteractivoProps> = ({ lat, lng, zoom = 18 }) => {
    const mapRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const existingScript = document.querySelector('script[src^="https://maps.googleapis.com/maps/api/js"]');
        if (existingScript) return;

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_KEY}`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            const google = (window as any).google;
            if (google && mapRef.current) {
                const map = new google.maps.Map(mapRef.current, {
                    center: { lat, lng },
                    zoom: 16,
                    disableDefaultUI: true,
                    gestureHandling: 'greedy',       // ✅ Zoom libre sin Ctrl
                    panControl: false,                // ✅ Oculta las flechitas
                    mapTypeControl: true,             // ✅ Muestra menú Mapa/Satélite
                    streetViewControl: true,          // ✅ Pegman activo
                    zoomControl: true,
                    fullscreenControl: true,             // ✅ Controles de zoom
                });

                const infoWindow = new google.maps.InfoWindow({
                    content: `
            <div style="font-weight:bold;">
              CETPRO "San Martín de Porres"<br/>
              Jirón Santa Clorinda 971, Urb. Palao, SMP
            </div>
          `,
                    headerDisabled: true,
                });

                const marker = new google.maps.Marker({
                    position: { lat, lng },
                    map,
                    title: 'CETPRO San Martín de Porres',
                });

                // *** Lógica para el comportamiento de "toggle" en el marcador ***
                marker.addListener("click", () => {
                    // Si el InfoWindow ya está abierto en este marcador, ciérralo.
                    // Una forma de verificar si está abierto es ver si tiene un mapa asociado.
                    // También puedes guardar una variable de estado (isInfoWindowOpen = true/false).
                    if (infoWindow.getMap() === map) {
                        infoWindow.close();
                    } else {
                        // Si el InfoWindow está cerrado, ábrelo en este marcador.
                        infoWindow.open(map, marker);
                    }
                });

                // ✅ Mostrar info automáticamente
                infoWindow.close(map, marker);



                // *** Aquí está la clave para cerrarlo al hacer clic en el mapa ***
                map.addListener("click", () => {
                    infoWindow.close();
                });
                // *** Aquí está la clave para cerrarlo al arrastrar y soltar el mapa ***
                map.addListener("dragend", () => {
                    infoWindow.close();
                });
                // --- ¡NUEVO! Cierra el InfoWindow al hacer zoom ---
                map.addListener("zoom_changed", () => {
                    infoWindow.close();
                });

            }
        };

        document.body.appendChild(script);
    }, [lat, lng, zoom]);

    return (
        <div
            ref={mapRef}
            style={{
                width: '100%',
                height: '100%',
                borderRadius: '8px',
                border: '2px solid white',
                color: 'black',
                textAlign: 'center',
            }}
        />
    );
};

export default MapaInteractivo;
