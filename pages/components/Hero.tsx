import React, { useEffect, useRef } from "react";
import config from "../index.json";
import Link from "next/link";

// Define interfaces for type safety
interface Point {
  x: number;
  y: number;
}

interface AnimationLine {
  points: Point[];
  color: string;
  speed: number;
  radius: number;
  pointCount: number;
  angleStep: number;
  phase: number;
}

const Hero = () => {
  const hero = config.hero;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Line properties
    const lineCount = 5;
    const lines: AnimationLine[] = [];
    const colors = ['#0d9488', '#f59e0b', '#06b6d4'];

    // Create flowing lines
    for (let i = 0; i < lineCount; i++) {
      lines.push({
        points: [],
        color: colors[i % colors.length],
        speed: 0.5 + Math.random() * 1.5,
        radius: 150 + (i * 50),
        pointCount: 6,
        angleStep: (Math.PI * 2) / 6,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Animation variables
    let animationFrame: number;
    let time = 0;

    function animate() {
      // Null checks are already at the top of useEffect, but we'll add a non-null assertion to help TypeScript
      const safeCtx = ctx!;
      const safeCanvas = canvas!;
      
      safeCtx.clearRect(0, 0, safeCanvas.width, safeCanvas.height);
      
      // Updated background gradient with new color scheme
      const bgGradient = safeCtx.createRadialGradient(
        safeCanvas.width / 2, safeCanvas.height / 2, 0,
        safeCanvas.width / 2, safeCanvas.height / 2, safeCanvas.width * 0.8
      );
      bgGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      bgGradient.addColorStop(1, 'rgba(240, 253, 250, 1)'); // Slight teal tint
      safeCtx.fillStyle = bgGradient;
      safeCtx.fillRect(0, 0, safeCanvas.width, safeCanvas.height);
      
      // Draw and update each line
      lines.forEach(line => {
        line.points = [];
        
        // Calculate points for this frame
        for (let i = 0; i <= line.pointCount; i++) {
          const angle = i * line.angleStep + time * 0.2 + line.phase;
          
          const xCenter = safeCanvas.width / 2;
          const yCenter = safeCanvas.height / 2;
          
          const xOffset = Math.cos(angle) * line.radius;
          const yOffset = Math.sin(angle) * line.radius;
          
          const waveOffset = Math.sin(time + i) * 50;
          
          line.points.push({
            x: xCenter + xOffset + (waveOffset * Math.cos(angle + Math.PI/2)),
            y: yCenter + yOffset + (waveOffset * Math.sin(angle + Math.PI/2))
          });
        }
        
        // Draw the smooth line
        safeCtx.beginPath();
        if (line.points.length > 0) {
          safeCtx.moveTo(line.points[0].x, line.points[0].y);
          
          for (let i = 0; i < line.points.length - 1; i++) {
            const current = line.points[i];
            const next = line.points[i + 1];
            
            // Control points for smooth curve
            const cp1x = current.x + (next.x - current.x) / 2;
            const cp1y = current.y;
            const cp2x = current.x + (next.x - current.x) / 2;
            const cp2y = next.y;
            
            safeCtx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, next.x, next.y);
          }
          
          // Close the path for the first and last points if we have enough points
          if (line.points.length > 1) {
            safeCtx.bezierCurveTo(
              line.points[line.points.length - 1].x,
              line.points[line.points.length - 1].y,
              line.points[0].x,
              line.points[0].y,
              line.points[0].x,
              line.points[0].y
            );
          }
        }
        
        // Gradient fill for the curve
        const gradient = safeCtx.createLinearGradient(0, 0, safeCanvas.width, safeCanvas.height);
        gradient.addColorStop(0, `${line.color}22`); // Very transparent
        gradient.addColorStop(0.5, `${line.color}33`);
        gradient.addColorStop(1, `${line.color}22`);
        safeCtx.fillStyle = gradient;
        safeCtx.fill();
        
        // Line stroke
        safeCtx.strokeStyle = `${line.color}55`;
        safeCtx.lineWidth = 1;
        safeCtx.stroke();
      });
      
      time += 0.01;
      animationFrame = requestAnimationFrame(animate);
    }

    animate();

    // Handle resize
    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <section className="relative h-screen overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full z-0"
      />
      <div className="relative z-10 px-8 lg:px-32 flex flex-col justify-center h-full">
        <h1 className="text-6xl font-bold tracking-wide">
          This is  
          <span className="ml-3 whitespace-nowrap bg-gradient-to-r from-teal-500 via-amber-500 to-cyan-500 bg-clip-text text-transparent">
            {hero.name}
          </span>
        </h1>
        <h1 className="text-6xl font-bold tracking-wide mt-4">{hero.subtitle}</h1>
        <Link href="/email-auth-flow/signin" className="text-2xl font-bold p-0.5 mt-6 w-44 bg-gradient-to-r from-teal-400 via-amber-400 to-cyan-400">
          <div className="bg-white">
            <span className="block text-center py-0.5 px-2 font-semibold bg-white font-bold bg-gradient-to-r from-teal-500 via-amber-500 to-cyan-500 bg-clip-text text-transparent">
              Try Demo!
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
};

export default Hero;