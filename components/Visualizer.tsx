import React, { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface VisualizerProps {
  inputVolume: number; // 0 to 1
  outputVolume: number; // 0 to 1
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ inputVolume, outputVolume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    
    const render = () => {
      time += 0.05;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Theme-aware colors
      const isDark = theme === 'dark';
      const idleColor = isDark ? 'rgba(96, 165, 250, 0.4)' : 'rgba(59, 130, 246, 0.3)'; // blue-400 : blue-500
      const aiCoreColor = isDark ? 'rgba(96, 165, 250, 0.8)' : 'rgba(59, 130, 246, 0.8)'; // blue-400 : blue-500
      const aiCoreColorFade = isDark ? 'rgba(96, 165, 250, 0)' : 'rgba(59, 130, 246, 0)';
      const waveColor = isDark ? 'rgba(129, 140, 248, 0.6)' : 'rgba(147, 197, 253, 0.6)'; // indigo-400 : blue-300

      if (!isActive) {
        // Idle state: gentle pulse
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50 + Math.sin(time) * 5, 0, Math.PI * 2);
        ctx.strokeStyle = idleColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      // Input visualization (User) - Outer Ring (keep green in both themes)
      const userRadius = 60 + (inputVolume * 100);
      ctx.beginPath();
      ctx.arc(centerX, centerY, userRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(34, 197, 94, ${0.3 + inputVolume})`; // Green (emerald-500)
      ctx.lineWidth = 4;
      ctx.stroke();

      // Output visualization (AI) - Inner Orb
      const aiRadius = 40 + (outputVolume * 80);
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, aiRadius);
      gradient.addColorStop(0, aiCoreColor);
      gradient.addColorStop(1, aiCoreColorFade);

      ctx.beginPath();
      ctx.arc(centerX, centerY, aiRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Dynamic waves
      if (outputVolume > 0.01) {
        ctx.beginPath();
        for (let i = 0; i < 360; i += 5) {
            const rad = (i * Math.PI) / 180;
            const waveAmp = Math.sin((i * 4 * Math.PI / 180) + (time * 5)) * (outputVolume * 20);
            const r = aiRadius + 10 + waveAmp;
            const x = centerX + Math.cos(rad) * r;
            const y = centerY + Math.sin(rad) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = waveColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [inputVolume, outputVolume, isActive, theme]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={400} 
      className="w-full max-w-[400px] h-auto aspect-square mx-auto"
    />
  );
};

export default Visualizer;