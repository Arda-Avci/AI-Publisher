import React, { useEffect, useState } from 'react';

/**
 * Animation types for word highlighting
 */
export type WordAnimationType = 'bounce' | 'pulse' | 'shake' | 'pop' | 'wave';

interface SubtitleWordProps {
  word: string;
  start: number;    // seconds
  end: number;      // seconds
  isActive: boolean;
  animationType?: WordAnimationType;
  highlightColor?: string;
  baseColor?: string;
  fontSize?: number;
  fontWeight?: number;
}

/**
 * Single animated word component for DynamicCaptions
 * Each word animates independently based on its timing
 */
export const SubtitleWord: React.FC<SubtitleWordProps> = ({
  word,
  isActive,
  animationType = 'bounce',
  highlightColor = '#FFD700',
  baseColor = '#FFFFFF',
  fontSize = 24,
  fontWeight = 700,
}) => {
  const [animating, setAnimating] = useState(false);

  // Trigger animation when word becomes active
  useEffect(() => {
    if (isActive) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const getAnimationStyle = (): React.CSSProperties => {
    if (!isActive) {
      return {
        color: baseColor,
        opacity: 0.6,
        transform: 'scale(1)',
        transition: 'color 0.15s, opacity 0.15s, transform 0.15s',
      };
    }

    const baseStyle: React.CSSProperties = {
      color: highlightColor,
      opacity: 1,
      textShadow: `0 0 20px ${highlightColor}80, 0 0 40px ${highlightColor}40`,
    };

    switch (animationType) {
      case 'bounce':
        return {
          ...baseStyle,
          animation: animating ? 'subtitleBounce 0.3s ease-out' : 'none',
          transform: animating ? 'translateY(-4px)' : 'scale(1.05)',
          transition: 'transform 0.1s ease-out',
        };

      case 'pulse':
        return {
          ...baseStyle,
          animation: animating ? 'subtitlePulse 0.3s ease-out' : 'none',
          transform: animating ? 'scale(1.15)' : 'scale(1.02)',
          transition: 'transform 0.1s ease-out',
        };

      case 'shake':
        return {
          ...baseStyle,
          animation: animating ? 'subtitleShake 0.3s ease-out' : 'none',
          transform: 'translateX(0)',
          transition: 'transform 0.1s ease-out',
        };

      case 'pop':
        return {
          ...baseStyle,
          animation: animating ? 'subtitlePop 0.3s ease-out' : 'none',
          transform: animating ? 'scale(1.2)' : 'scale(1.05)',
          transition: 'transform 0.1s ease-out',
        };

      case 'wave':
        return {
          ...baseStyle,
          animation: 'subtitleWave 0.6s ease-in-out infinite',
          transform: 'translateY(0)',
          transition: 'transform 0.1s ease-out',
        };

      default:
        return baseStyle;
    }
  };

  return (
    <span
      style={{
        display: 'inline-block',
        marginRight: '0.25em',
        fontSize: `${fontSize}px`,
        fontWeight,
        lineHeight: 1.4,
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        whiteSpace: 'nowrap',
        ...getAnimationStyle(),
      }}
    >
      {word}
    </span>
  );
};

export default SubtitleWord;