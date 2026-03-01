'use client';

import { Box } from '@mui/material';
import { useEffect, useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import CarruselSlide from './CarruselSlide';
import CarruselBienvenidaSlide from './CarruselBienvenidaSlide';

export type Modulo = { id: number; tituloComercial: string; slug: string };
export type Carrera = { id: number; tituloComercial: string; slug: string; codigo?: string | null; duracion?: number; modulos: Modulo[] };
export type Especialidad = { id: number; tituloComercial: string; slug: string; fondo: string | null; portada: string | null; carreras: Carrera[] };

const BIENVENIDA: Especialidad = {
  id: -1,
  tituloComercial: 'Bienvenida',
  slug: 'bienvenida',
  fondo: null,
  portada: null,
  carreras: [],
};

export default function CarruselPortada() {
  const [data, setData] = useState<Especialidad[]>([]);
  const swiperRef = useRef<any>(null);
  const prevRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLDivElement | null>(null);

  // Carga de data con fallback
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/data/carrusel.json', { cache: 'no-store' });
        const json = await res.json();
        const base: Especialidad[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        const limpio = base.filter(Boolean);
        const sinBienvenida = limpio.filter(e => e.id !== -1);
        setData(sinBienvenida);
      } catch (err) {
        console.error('Error cargando carrusel:', err);
        setData([]); // seguiremos mostrando Bienvenida
      }
    })();
  }, []);

  // Actualiza navegación cuando haya instancia
  useEffect(() => {
    if (swiperRef.current) {
      swiperRef.current.update?.();
      swiperRef.current.navigation?.init?.();
      swiperRef.current.navigation?.update?.();
    }
  }, [data.length]);

  // Siempre habrá al menos 1 slide (Bienvenida)
  const slides: Especialidad[] = [BIENVENIDA, ...data];

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '1100px',
        m: '0 auto',
        position: 'relative',
        '& .swiper, & .swiper-slide': { minHeight: 360 }, // altura mínima garantizada
        '& .swiper-button-next, & .swiper-button-prev': { display: 'none !important' }, // sin flechas azules
      }}
    >
      {/* Botones propios */}
      <Box ref={prevRef} sx={botonNavegacion('left')}>&lt;</Box>
      <Box ref={nextRef} sx={botonNavegacion('right')}>&gt;</Box>

      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        loop
        autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
        onBeforeInit={(swiper) => {
          swiperRef.current = swiper;
          const nav = swiper.params.navigation as any;
          if (nav && typeof nav !== 'boolean') {
            nav.prevEl = prevRef.current;
            nav.nextEl = nextRef.current;
          }
        }}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
          swiper.navigation?.init?.();
          swiper.navigation?.update?.();
        }}
        navigation
        pagination={{
          clickable: true,
          el: '.swiper-pagination-custom',
          renderBullet: (index, className) =>
            `<span class="${className}" style="width:28px;height:28px;background:rgba(255,255,255,.4);color:#000;font-size:13px;border-radius:50%;display:flex;align-items:center;justify-content:center;">${index + 1}</span>`,
        }}
      >
        {slides.map((esp, idx) => (
          esp.id === -1 ? (
            // 👇 10s SOLO para la slide de Bienvenida
            <SwiperSlide key={esp.id} data-swiper-autoplay="10000">
              <CarruselBienvenidaSlide />
            </SwiperSlide>
          ) : (
            <SwiperSlide key={`${esp.id}-${idx}`}>
              <CarruselSlide especialidad={esp} />
            </SwiperSlide>
          )
        ))}
      </Swiper>

      {/* Paginación personalizada */}
      <Box
        className="swiper-pagination-custom"
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 0,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none',
          '& span': { pointerEvents: 'auto' },
        }}
      />
    </Box>
  );
}

const botonNavegacion = (posicion: 'left' | 'right') => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  [posicion]: 8,
  zIndex: 10,
  width: 40,
  height: 40,
  borderRadius: '50%',
  backgroundColor: 'rgba(255,255,255,0.3)',
  color: 'rgba(103,103,103,0.7)',
  textShadow: '0 0 8px rgba(255,255,255,0.95), 0 0 16px rgba(255,255,255,0.85)',
  fontSize: '24px',
  display: { xs: 'none', sm: 'none', md: 'flex' },
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  userSelect: 'none',
  transition: 'all .2s ease',
  '&:hover': { backgroundColor: 'rgba(255,255,255,0.5)' },
  '&:active': { transform: 'translateY(-50%) scale(0.96)' },
});
