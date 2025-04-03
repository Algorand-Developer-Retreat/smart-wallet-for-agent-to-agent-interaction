'use client'

import { useWindowSize } from '@/hooks/window-size';
import React, { useRef, useEffect } from 'react';

const colors = [
  { red: 255, green: 235, blue: 0 },    // #FFEB00 - yellow
  { red: 68, green: 248, blue: 189 },   // #44F8BD - green
  { red: 243, green: 95, blue: 242 },   // #F35FF2 - pink
  { red: 148, green: 57, blue: 230 },   // #9439E6 - purple
  { red: 0, green: 57, blue: 203 },     // #0039CB - blue
  { red: 0, green: 240, blue: 255 }     // #00F0FF - cyan
];

const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

const getRainbowColor = (distance: number) => {
  const frequency = 0.1;
  const index = Math.floor(frequency * distance) % colors.length;
  const nextIndex = (index + 1) % colors.length;
  const blend = (frequency * distance) % 1;

  const color1 = colors[index];
  const color2 = colors[nextIndex];

  const red = Math.round(color1.red * (1 - blend) + color2.red * blend);
  const green = Math.round(color1.green * (1 - blend) + color2.green * blend);
  const blue = Math.round(color1.blue * (1 - blend) + color2.blue * blend);

  return { red, green, blue };
};

const blendColors = (color1: { red: number, green: number, blue: number }, color2: { red: number, green: number, blue: number }, weight: number) => {
  const r = Math.round(color1.red * (1 - weight) + color2.red * weight);
  const g = Math.round(color1.green * (1 - weight) + color2.green * weight);
  const b = Math.round(color1.blue * (1 - weight) + color2.blue * weight);
  return `rgba(${r}, ${g}, ${b}, ${(weight * .8) + .2})`;
};

const DotGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width !== window.innerWidth + 80) {
      canvas.width = window.innerWidth + 80;
    }

    if (canvas.height !== window.innerHeight + 80) {
      canvas.height = window.innerHeight + 80;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dotSpacing = 30; // Tighter grid
    const waveSpeed = 0.0005; // Slower wave speed
    const waveFrequency = 0.015; // Adjust wave frequency

    const shapes: { x: number, y: number, originalX: number, originalY: number, type: string }[] = [];
    for (let y = 0; y <= canvas.height; y += dotSpacing) {
      for (let x = 0; x <= canvas.width; x += dotSpacing) {
        const type = 'circle';
        shapes.push({ x, y, originalX: x, originalY: y, type });
      }
    }

    const drawCircle = (x: number, y: number, size: number, color: string) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      shapes.forEach(shape => {
        const distance = Math.sqrt(shape.originalX * shape.originalX + shape.originalY * shape.originalY);
        const offsetX = Math.sin(time * waveSpeed + distance * waveFrequency) * dotSpacing;
        const offsetY = Math.cos(time * waveSpeed + distance * waveFrequency) * dotSpacing;
        const size = 10 + Math.sin(time * waveSpeed + distance * waveFrequency) * 2;
        // const rotation = Math.sin(time * waveSpeed + distance * waveFrequency);
        const waveProgress = (Math.sin(time * waveSpeed + distance * waveFrequency) + 1) / 2;

        const colorOne = { red: 243, green: 95, blue: 242 };
        const colorTwo = { red: 148, green: 57, blue: 230 };
        const color = blendColors(colorOne, colorTwo, waveProgress);

        drawCircle(shape.originalX + offsetX, shape.originalY + offsetY, size, color);
      });

      requestAnimationFrame(animate);
    };

    animate(0);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className='absolute -top-10 -left-10 z-[11]'
    ></canvas>
  );
};

export default DotGrid;
