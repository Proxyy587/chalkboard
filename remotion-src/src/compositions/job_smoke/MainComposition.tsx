import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

export const MainComposition: React.FC<{topic?: string}> = ({topic}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'});
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
      <h1 style={{fontSize: 64, margin: 0}}>{topic || 'Clarity smoke test'}</h1>
    </AbsoluteFill>
  );
};
