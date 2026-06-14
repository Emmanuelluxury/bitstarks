'use client';

import { useEffect, useRef, CSSProperties } from 'react';

interface Dot {
  id: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  depth: number;
  oscillationX: number;
  oscillationY: number;
  phaseX: number;
  phaseY: number;
}

const getDotConfig = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  return {
    count:                isMobile ? 65  : 120,
    minSize:              isMobile ? 1.0 : 0.8,
    maxSize:              isMobile ? 2.6 : 3.2,
    minOpacity:           isMobile ? 0.18 : 0.15,
    maxOpacity:           isMobile ? 0.55 : 0.65,
    minSpeed:             0.02,
    maxSpeed:             0.08,
    oscillationAmplitude: isMobile ? 20  : 40,
    oscillationFrequency: 0.003,
    colorRGB: { r: 124, g: 58, b: 237 },
  };
};

export default function FloatingDots() {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const dotsRef       = useRef<Dot[]>([]);
  const animationRef  = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const configRef     = useRef(getDotConfig());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const initializeDots = (): void => {
      configRef.current = getDotConfig();
      const cfg = configRef.current;
      dotsRef.current = Array.from({ length: cfg.count }, (_, i): Dot => {
        const depth   = Math.random();
        const size    = cfg.minSize + depth * (cfg.maxSize - cfg.minSize);
        const opacity = cfg.minOpacity + depth * (cfg.maxOpacity - cfg.minOpacity);
        const speed   = cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed);
        return {
          id: i,
          x:     Math.random() * canvas.width,
          y:     Math.random() * canvas.height,
          baseX: Math.random() * canvas.width,
          baseY: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          size, opacity, depth,
          oscillationX: Math.random() * cfg.oscillationAmplitude,
          oscillationY: Math.random() * cfg.oscillationAmplitude,
          phaseX: Math.random() * Math.PI * 2,
          phaseY: Math.random() * Math.PI * 2,
        };
      });
    };

    const resizeCanvas = (): void => {
      const prevWidth  = canvas.width  || window.innerWidth;
      const prevHeight = canvas.height || window.innerHeight;
      const wasMobile  = prevWidth < 768;
      const isMobile   = window.innerWidth < 768;

      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;

      if (wasMobile !== isMobile) {
        // Breakpoint changed — reinitialise with correct dot count/size
        initializeDots();
      } else if (dotsRef.current.length > 0) {
        // Same breakpoint — rescale positions to fill the new canvas
        const scaleX = canvas.width  / prevWidth;
        const scaleY = canvas.height / prevHeight;
        dotsRef.current.forEach(dot => {
          dot.x     *= scaleX;  dot.y     *= scaleY;
          dot.baseX *= scaleX;  dot.baseY *= scaleY;
        });
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    resizeCanvas();
    initializeDots();

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(document.documentElement);

    const animate = (): void => {
      frameCountRef.current++;
      const cfg = configRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      dotsRef.current.forEach((dot): void => {
        dot.baseX += dot.vx;
        dot.baseY += dot.vy;

        if (dot.baseX < -50)              dot.baseX = canvas.width  + 50;
        if (dot.baseX > canvas.width + 50) dot.baseX = -50;
        if (dot.baseY < -50)              dot.baseY = canvas.height + 50;
        if (dot.baseY > canvas.height + 50) dot.baseY = -50;

        const ox = Math.sin(frameCountRef.current * cfg.oscillationFrequency + dot.phaseX) * dot.oscillationX;
        const oy = Math.cos(frameCountRef.current * cfg.oscillationFrequency + dot.phaseY) * dot.oscillationY;
        dot.x = dot.baseX + ox;
        dot.y = dot.baseY + oy;

        const opacityVariation = Math.sin(frameCountRef.current * 0.002 + dot.id) * 0.15;
        const finalOpacity = Math.max(dot.opacity * 0.6, dot.opacity + opacityVariation);

        ctx.fillStyle = `rgba(${cfg.colorRGB.r}, ${cfg.colorRGB.g}, ${cfg.colorRGB.b}, ${finalOpacity})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return (): void => {
      observer.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const canvasStyles: CSSProperties = {
    position: 'fixed',
    top: 0, left: 0,
    width: '100%', height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
    background: 'transparent',
    willChange: 'auto',
    imageRendering: 'crisp-edges',
  };

  return <canvas ref={canvasRef} style={canvasStyles} aria-hidden="true" />;
}
