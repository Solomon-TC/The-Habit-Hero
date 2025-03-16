"use client";

import { useEffect, useState } from "react";
import ReactConfetti from "react-confetti";

interface ConfettiProps {
  duration?: number;
  pieces?: number;
}

export default function Confetti({
  duration = 3000,
  pieces = 200,
}: ConfettiProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Set dimensions
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Handle window resize
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    // Hide confetti after duration
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, duration);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [duration]);

  if (!showConfetti) return null;

  return (
    <ReactConfetti
      width={dimensions.width}
      height={dimensions.height}
      recycle={false}
      numberOfPieces={pieces}
      gravity={0.2}
      colors={["#22c55e", "#3b82f6", "#f59e0b", "#e882e8", "#06b6d4"]}
    />
  );
}
