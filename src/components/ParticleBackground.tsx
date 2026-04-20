import { useEffect, useRef } from "react";

/**
 * Animated particle network background — ported from the ECHO.x repo.
 * Cyan / purple / green dots that drift, pulse, attract toward the cursor,
 * and draw connection lines when near each other.
 */
export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let mouseX = -1000;
    let mouseY = -1000;

    const palettes = [
      { r: 0,   g: 240, b: 255 }, // cyan
      { r: 191, g: 0,   b: 255 }, // purple
      { r: 0,   g: 255, b: 136 }, // green
    ];

    type P = {
      x: number; y: number; vx: number; vy: number;
      size: number; alpha: number; alphaDir: number;
      r: number; g: number; b: number; connectDist: number;
    };

    const createParticle = (): P => {
      const c = palettes[Math.floor(Math.random() * palettes.length)];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
        alphaDir: (Math.random() - 0.5) * 0.01,
        r: c.r, g: c.g, b: c.b,
        connectDist: 100 + Math.random() * 60,
      };
    };

    let particles: P[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.min(120, Math.floor(window.innerWidth / 14));
      particles = Array.from({ length: count }, createParticle);
    };

    const onMouse = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < a.connectDist) {
            const opacity = (1 - dist / a.connectDist) * 0.2;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${a.r},${a.g},${a.b},${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // particles
      for (const p of particles) {
        const mdx = mouseX - p.x, mdy = mouseY - p.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 200) {
          p.vx += (mdx / mdist) * 0.03;
          p.vy += (mdy / mdist) * 0.03;
        }

        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.99; p.vy *= 0.99;
        p.alpha += p.alphaDir;
        if (p.alpha <= 0.1 || p.alpha >= 0.8) p.alphaDir *= -1;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.alpha})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `rgba(${p.r},${p.g},${p.b},0.8)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);
    document.addEventListener("mousemove", onMouse);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
