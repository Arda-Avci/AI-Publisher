import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from 'react';
export const RemotionVideo = ({ scenes, width = 1080, height = 1920, }) => {
    const fps = 30;
    const _durationInFrames = useMemo(() => {
        return scenes.reduce((total, scene) => total + (scene.durationInFrames || fps * 6), 0);
    }, [scenes, fps]);
    void _durationInFrames;
    if (scenes.length === 0) {
        return (_jsx("div", { style: {
                width,
                height,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1a1a2e',
                color: '#fff',
                fontFamily: 'Arial, sans-serif',
                fontSize: 24,
            }, children: _jsx("p", { children: "Hen\u00FCz sahne eklenmemi\u015F" }) }));
    }
    return (_jsxs("div", { style: {
            width,
            height,
            position: 'relative',
            overflow: 'hidden',
            background: '#0f0f1a',
            fontFamily: 'Arial, sans-serif',
        }, children: [scenes.map((scene, index) => {
                const startFrame = scenes
                    .slice(0, index)
                    .reduce((sum, s) => sum + (s.durationInFrames || fps * 6), 0);
                return (_jsx(SceneLayer, { scene: scene, startFrame: startFrame, durationInFrames: scene.durationInFrames || fps * 6, fps: fps }, scene.sceneNumber));
            }), _jsx("div", { style: {
                    position: 'absolute',
                    bottom: 40,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    color: '#00F2FE',
                    fontSize: 14,
                    fontWeight: 'bold',
                    textShadow: '0 0 10px rgba(0,242,254,0.5)',
                    pointerEvents: 'none',
                }, children: "AI-Publisher Studio" })] }));
};
const SceneLayer = ({ scene }) => {
    return (_jsxs("div", { style: {
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            boxSizing: 'border-box',
        }, children: [scene.videoPath ? (_jsx("video", { src: scene.videoPath, style: {
                    width: '100%',
                    height: '70%',
                    objectFit: 'cover',
                    borderRadius: 12,
                }, muted: true, loop: true })) : (_jsxs("div", { style: {
                    width: '100%',
                    height: '70%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 48,
                    fontWeight: 'bold',
                }, children: ["Sahne ", scene.sceneNumber] })), _jsx("div", { style: {
                    marginTop: 20,
                    color: '#fff',
                    fontSize: 18,
                    textAlign: 'center',
                    maxWidth: '90%',
                    lineHeight: 1.5,
                }, children: scene.speechText || '' })] }));
};
export default RemotionVideo;
