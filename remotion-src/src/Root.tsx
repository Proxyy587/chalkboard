import React from 'react';
import {AbsoluteFill, Composition, interpolate, useCurrentFrame} from 'remotion';

const FallbackComposition: React.FC<{topic?: string}> = ({topic}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0B1020',
        color: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        opacity,
      }}
    >
      <h1 style={{fontSize: 64, margin: 0}}>{topic || 'Clarity Video'}</h1>
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MainVideo"
      component={FallbackComposition}
      durationInFrames={90}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{topic: 'Clarity Video'}}
    />
  );
};
