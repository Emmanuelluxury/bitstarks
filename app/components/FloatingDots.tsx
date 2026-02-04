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

// Configuration for floating dots animation
const DOT_CONFIG = {
  count: 120,
  minSize: 0.8,
  maxSize: 3.2,
  minOpacity: 0.15,
  maxOpacity: 0.65,
  minSpeed: 0.02,
  maxSpeed: 0.08,
  oscillationAmplitude: 40,
  oscillationFrequency: 0.003,
  colorRGB: { r: 124, g: 58, b: 237 }, // Purple color
} as const;

export default function FloatingDots() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const animationRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resizeCanvas = (): void => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    const initializeDots = (): void => {
      dotsRef.current = Array.from({ length: DOT_CONFIG.count }, (_, i): Dot => {
        const depth = Math.random();
        const size = DOT_CONFIG.minSize + depth * (DOT_CONFIG.maxSize - DOT_CONFIG.minSize);
        const opacity = DOT_CONFIG.minOpacity + depth * (DOT_CONFIG.maxOpacity - DOT_CONFIG.minOpacity);
        const speed = DOT_CONFIG.minSpeed + Math.random() * (DOT_CONFIG.maxSpeed - DOT_CONFIG.minSpeed);

        return {
          id: i,
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          baseX: Math.random() * canvas.width,
          baseY: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          size,
          opacity,
          depth,
          oscillationX: Math.random() * DOT_CONFIG.oscillationAmplitude,
          oscillationY: Math.random() * DOT_CONFIG.oscillationAmplitude,
          phaseX: Math.random() * Math.PI * 2,
          phaseY: Math.random() * Math.PI * 2,
        };
      });
    };

    initializeDots();

    const animate = (): void => {
      frameCountRef.current++;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      dotsRef.current.forEach((dot): void => {
        dot.baseX += dot.vx;
        dot.baseY += dot.vy;

        if (dot.baseX < -50) dot.baseX = canvas.width + 50;
        if (dot.baseX > canvas.width + 50) dot.baseX = -50;
        if (dot.baseY < -50) dot.baseY = canvas.height + 50;
        if (dot.baseY > canvas.height + 50) dot.baseY = -50;

        const oscillationX = Math.sin(frameCountRef.current * DOT_CONFIG.oscillationFrequency + dot.phaseX) * dot.oscillationX;
        const oscillationY = Math.cos(frameCountRef.current * DOT_CONFIG.oscillationFrequency + dot.phaseY) * dot.oscillationY;

        dot.x = dot.baseX + oscillationX;
        dot.y = dot.baseY + oscillationY;

        const opacityVariation = Math.sin(frameCountRef.current * 0.002 + dot.id) * 0.15;
        const finalOpacity = Math.max(dot.opacity * 0.6, dot.opacity + opacityVariation);

        ctx.fillStyle = `rgba(${DOT_CONFIG.colorRGB.r}, ${DOT_CONFIG.colorRGB.g}, ${DOT_CONFIG.colorRGB.b}, ${finalOpacity})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return (): void => {
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const canvasStyles: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
    background: 'transparent',
    willChange: 'auto',
    imageRendering: 'crisp-edges',
  };

  return (
    <canvas
      ref={canvasRef}
      style={canvasStyles}
      aria-hidden="true"
    />
  );
}
