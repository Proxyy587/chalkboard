import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const MainComposition: React.FC<{ topic?: string }> = ({ topic }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#0B1020', color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Title Sequence */}
      <Sequence from={0} durationInFrames={150}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            fontSize: 64,
            fontWeight: 800,
            textAlign: 'center',
            opacity: interpolate(frame, [0, 30, 120, 150], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `scale(${spring({ frame, fps, config: { damping: 14 } })})`
          }}>
            The Amazing Functions of Human Kidneys
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Body & Kidney Location */}
      <Sequence from={150} durationInFrames={150}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 400,
            height: 600,
            backgroundColor: '#1E293B',
            borderRadius: 20,
            position: 'relative',
            opacity: interpolate(frame - 150, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          }}>
            {/* Kidney shapes */}
            <div style={{
              position: 'absolute',
              top: 250,
              left: 100,
              width: 60,
              height: 90,
              backgroundColor: '#DC2626',
              borderRadius: '50% 30% 50% 30%',
              transform: `scale(${1 + 0.05 * Math.sin((frame - 150) * 0.1)})`,
              boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)'
            }} />
            <div style={{
              position: 'absolute',
              top: 250,
              right: 100,
              width: 60,
              height: 90,
              backgroundColor: '#DC2626',
              borderRadius: '50% 30% 50% 30%',
              transform: `scale(${1 + 0.05 * Math.sin((frame - 150) * 0.1 + 0.5)})`,
              boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)'
            }} />
          </div>
          <div style={{
            position: 'absolute',
            top: 100,
            left: 100,
            fontSize: 32,
            fontWeight: 700,
            opacity: interpolate(frame - 150, [30, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateX(${interpolate(frame - 150, [30, 60], [-100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`
          }}>
            What do kidneys do?
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Filter Blood Section */}
      <Sequence from={300} durationInFrames={150}>
        <AbsoluteFill style={{ flexDirection: 'row' }}>
          {/* Left side - Kidney */}
          <div style={{ flex: 1, alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
            <div style={{
              width: 200,
              height: 300,
              backgroundColor: '#DC2626',
              borderRadius: '40% 20% 40% 20%',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Blood vessel animation */}
              <div style={{
                position: 'absolute',
                width: 10,
                height: 200,
                backgroundColor: '#EF4444',
                left: '50%',
                transform: `translateX(-50%) translateY(${interpolate(frame - 300, [0, 150], [-200, 200], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
                opacity: 0.7
              }} />
            </div>
          </div>
          
          {/* Right side - Water droplets */}
          <div style={{ flex: 1, alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              fontSize: 48,
              fontWeight: 800,
              color: '#F59E0B',
              marginBottom: 40,
              opacity: spring({ frame: Math.max(0, frame - 320), fps, config: { damping: 14 } }),
              transform: `scale(${spring({ frame: Math.max(0, frame - 320), fps, config: { damping: 14 } })})`
            }}>
              1. Filter Blood
            </div>
            {/* Water droplets */}
            {[0, 30, 60].map((delay) => (
              <div key={delay} style={{
                width: 20,
                height: 20,
                backgroundColor: '#06B6D4',
                borderRadius: '50%',
                marginBottom: 10,
                opacity: interpolate(frame - 300 - delay, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                transform: `translateY(${interpolate(frame - 300 - delay, [0, 50], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`
              }} />
            ))}
            <div style={{
              fontSize: 28,
              marginTop: 30,
              opacity: interpolate(frame - 300, [60, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            }}>
              Removes Waste
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Balance Fluids & Electrolytes */}
      <Sequence from={450} durationInFrames={150}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#10B981',
            marginBottom: 40,
            opacity: interpolate(frame - 450, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          }}>
            2. Balance Fluids
          </div>
          <div style={{
            width: 180,
            height: 270,
            backgroundColor: '#DC2626',
            borderRadius: '40% 20% 40% 20%',
            position: 'relative',
            transform: `rotate(${interpolate(frame - 450, [0, 150], [0, 5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}) scale(${1 + 0.05 * Math.sin((frame - 450) * 0.2)})`
          }}>
            {/* Happy face */}
            <div style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 60,
              height: 30,
              borderBottom: '8px solid white',
              borderRadius: '0 0 30px 30px'
            }} />
          </div>
          <div style={{
            fontSize: 28,
            marginTop: 40,
            opacity: interpolate(frame - 450, [80, 110], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          }}>
            Keeps electrolytes in check
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Hormone Regulation & Blood Pressure */}
      <Sequence from={600} durationInFrames={300}>
        <AbsoluteFill style={{ padding: 60 }}>
          <div style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#F59E0B',
            marginBottom: 40,
            opacity: interpolate(frame - 600, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          }}>
            3. Hormone Regulation
          </div>
          
          {/* Arrows animation */}
          <div style={{ position: 'relative', height: 200 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                position: 'absolute',
                left: 100 + i * 200,
                top: 50,
                width: 100,
                height: 4,
                backgroundColor: '#7C3AED',
                transform: `scaleX(${interpolate(frame - 600 - i * 20, [0, 30, 60], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
                opacity: interpolate(frame - 600 - i * 20, [0, 30, 60], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              }} />
            ))}
          </div>

          <div style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#06B6D4',
            marginTop: 100,
            opacity: interpolate(frame - 600, [120, 150], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          }}>
            4. Blood Pressure Control
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Recap & Final Message */}
      <Sequence from={900} durationInFrames={300}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          {/* Recap icons */}
          <div style={{ display: 'flex', gap: 40, marginBottom: 60 }}>
            {['Filtering', 'Balancing', 'Regulating', 'Controlling'].map((text, i) => (
              <div key={i} style={{
                width: 120,
                height: 120,
                backgroundColor: i === 0 ? '#F59E0B' : i === 1 ? '#10B981' : i === 2 ? '#7C3AED' : '#06B6D4',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 700,
                textAlign: 'center',
                opacity: spring({ frame: Math.max(0, frame - 900 - i * 15), fps, config: { damping: 14 } }),
                transform: `scale(${spring({ frame: Math.max(0, frame - 900 - i * 15), fps, config: { damping: 14 } })}`,
                boxShadow: `0 0 20px ${i === 0 ? '#F59E0B' : i === 1 ? '#10B981' : i === 2 ? '#7C3AED' : '#06B6D4'}40`
              }}>
                {text}
              </div>
            ))}
          </div>

          {/* Final message */}
          <div style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#10B981',
            textAlign: 'center',
            opacity: interpolate(frame - 900, [150, 180, 270, 300], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(frame - 900, [150, 180], [50, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`
          }}>
            Take care of your kidneys!
          </div>

          {/* Ending CTA */}
          <div style={{
            fontSize: 48,
            fontWeight: 800,
            textAlign: 'center',
            opacity: interpolate(frame - 900, [210, 240, 290, 300], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(frame - 900, [210, 240], [50, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
            position: 'absolute',
            bottom: 100,
            width: '100%'
          }}>
            Like, Share, and Subscribe for more!
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};