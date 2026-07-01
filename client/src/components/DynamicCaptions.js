import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useRef, useMemo } from 'react';
import { SubtitleWord } from './SubtitleWord.js';
/**
 * DynamicCaptions — Hormozi-style word-by-word animated captions
 *
 * Displays words with precise timing, highlighting each word as it is spoken.
 * Uses CSS @keyframes for smooth animations (bounce, pulse, shake, pop, wave).
 *
 * @example
 * ```tsx
 * <DynamicCaptions
 *   words={[{ word: "Hello", start: 0.0, end: 0.5 }, { word: "World", start: 0.5, end: 1.0 }]}
 *   currentTime={0.3}
 *   duration={10}
 *   animationType="bounce"
 *   highlightColor="#FFD700"
 * />
 * ```
 */
export const DynamicCaptions = ({ words, currentTime, animationType = 'bounce', highlightColor = '#FFD700', baseColor = '#FFFFFF', fontSize = 24, fontWeight = 700, visible = true, className, style, positionTop = 75, align = 'center', autoPlay = true, }) => {
    const containerRef = useRef(null);
    // Find the active word index based on current playback time
    const activeWordIndex = useMemo(() => {
        if (!autoPlay || words.length === 0)
            return -1;
        const idx = words.findIndex((w) => currentTime >= w.start && currentTime < w.end);
        return idx;
    }, [words, currentTime, autoPlay]);
    // Check if captions should be visible based on word timings
    const hasActiveContent = useMemo(() => {
        if (words.length === 0)
            return false;
        return currentTime >= words[0].start && currentTime <= words[words.length - 1].end;
    }, [words, currentTime]);
    // Determine if we should render at all
    const shouldRender = visible && words.length > 0 && (autoPlay ? hasActiveContent : true);
    // Build inline CSS keyframes
    useEffect(() => {
        if (typeof document === 'undefined')
            return;
        const styleId = 'dynamic-captions-keyframes';
        if (document.getElementById(styleId))
            return;
        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.textContent = `
      @keyframes subtitleBounce {
        0% { transform: translateY(0) scale(1); }
        40% { transform: translateY(-6px) scale(1.08); }
        70% { transform: translateY(-2px) scale(1.04); }
        100% { transform: translateY(0) scale(1); }
      }

      @keyframes subtitlePulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }

      @keyframes subtitleShake {
        0% { transform: translateX(0); }
        20% { transform: translateX(-3px); }
        40% { transform: translateX(3px); }
        60% { transform: translateX(-2px); }
        80% { transform: translateX(2px); }
        100% { transform: translateX(0); }
      }

      @keyframes subtitlePop {
        0% { transform: scale(0.8); opacity: 0.5; }
        50% { transform: scale(1.3); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }

      @keyframes subtitleWave {
        0% { transform: translateY(0); }
        25% { transform: translateY(-3px); }
        50% { transform: translateY(0); }
        75% { transform: translateY(2px); }
        100% { transform: translateY(0); }
      }
    `;
        document.head.appendChild(styleSheet);
        return () => {
            const existing = document.getElementById(styleId);
            if (existing)
                existing.remove();
        };
    }, []);
    if (!shouldRender) {
        return null;
    }
    // Group words by lines to avoid overflow
    const lines = useMemo(() => {
        const result = [];
        let currentLine = [];
        // Simple line breaking: max ~10 words per line
        for (let i = 0; i < words.length; i++) {
            currentLine.push(words[i]);
            if (currentLine.length >= 10 || i === words.length - 1) {
                result.push(currentLine);
                currentLine = [];
            }
        }
        return result;
    }, [words]);
    const getAlignStyle = () => {
        switch (align) {
            case 'left':
                return { textAlign: 'left', justifyContent: 'flex-start' };
            case 'right':
                return { textAlign: 'right', justifyContent: 'flex-end' };
            case 'center':
            default:
                return { textAlign: 'center', justifyContent: 'center' };
        }
    };
    return (_jsx("div", { ref: containerRef, className: className, style: {
            position: 'absolute',
            top: `${positionTop}%`,
            left: 0,
            right: 0,
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '0 16px',
            pointerEvents: 'none',
            zIndex: 10,
            ...getAlignStyle(),
            ...style,
        }, children: lines.map((line, lineIndex) => {
            // Find global word index for this line's first word
            const lineStartWordIndex = lines.slice(0, lineIndex).reduce((sum, l) => sum + l.length, 0);
            return (_jsx("div", { style: {
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
                    maxWidth: '90%',
                    gap: '0 2px',
                }, children: line.map((wordObj, wordInLineIndex) => {
                    const globalIndex = lineStartWordIndex + wordInLineIndex;
                    const isActive = autoPlay && globalIndex === activeWordIndex;
                    return (_jsx(SubtitleWord, { word: wordObj.word, start: wordObj.start, end: wordObj.end, isActive: isActive, animationType: animationType, highlightColor: highlightColor, baseColor: baseColor, fontSize: fontSize, fontWeight: fontWeight }, `${globalIndex}-${wordObj.word}`));
                }) }, lineIndex));
        }) }));
};
export default DynamicCaptions;
