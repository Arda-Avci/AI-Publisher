import React, { useMemo } from 'react';

interface RemotionVideoProps {
  scenes: Array<{
    sceneNumber: number;
    videoPath?: string;
    speechText?: string;
    durationInFrames?: number;
  }>;
  width?: number;
  height?: number;
}

export const RemotionVideo: React.FC<RemotionVideoProps> = ({
  scenes,
  width = 1080,
  height = 1920,
}) => {
  const fps = 30;
  const durationInFrames = useMemo(() => {
    return scenes.reduce((total, scene) => total + (scene.durationInFrames || fps * 6), 0);
  }, [scenes, fps]);

  if (scenes.length === 0) {
    return (
      <div style={{
        width, height,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#1a1a2e', color: '#fff',
        fontFamily: 'Arial, sans-serif',
        fontSize: 24,
      }}>
        <p>Henüz sahne eklenmemiş</p>
      </div>
    );
  }

  return (
    <div style={{
      width, height,
      position: 'relative',
      overflow: 'hidden',
      background: '#0f0f1a',
      fontFamily: 'Arial, sans-serif',
    }}>
      {scenes.map((scene, index) => {
        const startFrame = scenes
          .slice(0, index)
          .reduce((sum, s) => sum + (s.durationInFrames || fps * 6), 0);

        return (
          <SceneLayer
            key={scene.sceneNumber}
            scene={scene}
            startFrame={startFrame}
            durationInFrames={scene.durationInFrames || fps * 6}
            fps={fps}
          />
        );
      })}

      <div style={{
        position: 'absolute',
        bottom: 40,
        left: 0, right: 0,
        textAlign: 'center',
        color: '#00F2FE',
        fontSize: 14,
        fontWeight: 'bold',
        textShadow: '0 0 10px rgba(0,242,254,0.5)',
        pointerEvents: 'none',
      }}>
        AI-Publisher Studio
      </div>
    </div>
  );
};

interface SceneLayerProps {
  scene: RemotionVideoProps['scenes'][0];
  startFrame: number;
  durationInFrames: number;
  fps: number;
}

const SceneLayer: React.FC<SceneLayerProps> = ({
  scene,
  durationInFrames,
}) => {
  return (
    <div style={{
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
    }}>
      {scene.videoPath ? (
        <video
          src={scene.videoPath}
          style={{
            width: '100%',
            height: '70%',
            objectFit: 'cover',
            borderRadius: 12,
          }}
          muted
          loop
        />
      ) : (
        <div style={{
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
        }}>
          Sahne {scene.sceneNumber}
        </div>
      )}

      <div style={{
        marginTop: 20,
        color: '#fff',
        fontSize: 18,
        textAlign: 'center',
        maxWidth: '90%',
        lineHeight: 1.5,
      }}>
        {scene.speechText || ''}
      </div>
    </div>
  );
};

export default RemotionVideo;
