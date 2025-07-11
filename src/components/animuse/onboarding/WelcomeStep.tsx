import React, { useState } from "react";

interface WelcomeStepProps {
  data: { name: string };
  updateData: (data: { name: string }) => void;
}

// Brutalist Geometric Shape Component
const BrutalistShape: React.FC<{ 
  type: 'square' | 'triangle' | 'circle' | 'rectangle';
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  color: string;
  rotation?: number;
}> = ({ type, size, position, color, rotation = 0 }) => {
  const sizeMap = {
    small: 'w-6 h-6',
    medium: 'w-12 h-12', 
    large: 'w-20 h-20'
  };

  const getShape = () => {
    switch (type) {
      case 'triangle':
        return (
          <div 
            className={`${sizeMap[size]} ${color}`}
            style={{
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              transform: `rotate(${rotation}deg)`,
              position: 'absolute',
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          />
        );
      case 'circle':
        return (
          <div 
            className={`${sizeMap[size]} ${color} rounded-full`}
            style={{
              transform: `rotate(${rotation}deg)`,
              position: 'absolute',
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          />
        );
      case 'rectangle':
        return (
          <div 
            className={`${sizeMap[size]} ${color} w-24 h-8`}
            style={{
              transform: `rotate(${rotation}deg)`,
              position: 'absolute',
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          />
        );
      default:
        return (
          <div 
            className={`${sizeMap[size]} ${color}`}
            style={{
              transform: `rotate(${rotation}deg)`,
              position: 'absolute',
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          />
        );
    }
  };

  return getShape();
};

export default function WelcomeStep({ data, updateData }: WelcomeStepProps) {
  const [isFocused, setIsFocused] = useState(false);

  // Brutalist geometric shapes
  const brutalistShapes = [
    { type: 'square' as const, size: 'large' as const, position: { x: 5, y: 10 }, color: 'bg-yellow-400', rotation: 45 },
    { type: 'triangle' as const, size: 'medium' as const, position: { x: 85, y: 15 }, color: 'bg-red-500', rotation: 0 },
    { type: 'circle' as const, size: 'small' as const, position: { x: 10, y: 80 }, color: 'bg-blue-600', rotation: 0 },
    { type: 'rectangle' as const, size: 'medium' as const, position: { x: 80, y: 75 }, color: 'bg-green-500', rotation: 30 },
    { type: 'square' as const, size: 'small' as const, position: { x: 50, y: 5 }, color: 'bg-purple-600', rotation: 0 },
    { type: 'triangle' as const, size: 'large' as const, position: { x: 90, y: 50 }, color: 'bg-orange-500', rotation: 180 },
    { type: 'circle' as const, size: 'medium' as const, position: { x: 3, y: 40 }, color: 'bg-pink-500', rotation: 0 },
  ];

  return (
    <div className="relative min-h-[500px] bg-white overflow-hidden">
      {/* Brutalist Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Geometric Shapes */}
        {brutalistShapes.map((shape, index) => (
          <BrutalistShape
            key={index}
            type={shape.type}
            size={shape.size}
            position={shape.position}
            color={shape.color}
            rotation={shape.rotation}
          />
        ))}

        {/* Bold Typography Background */}
        <div className="absolute top-10 left-5 transform -rotate-12 opacity-15">
          <span className="text-6xl md:text-8xl font-black text-black">WELCOME</span>
        </div>
        <div className="absolute bottom-10 right-5 transform rotate-12 opacity-15">
          <span className="text-6xl md:text-8xl font-black text-black">HERO</span>
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px'
        }}></div>

        {/* Bold Stripes */}
        <div className="absolute top-0 left-1/5 w-1 h-full bg-black opacity-20 transform rotate-12"></div>
        <div className="absolute top-0 right-1/4 w-2 h-full bg-red-500 opacity-25 transform -rotate-6"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[500px] px-4 py-8">
        <div className="w-full max-w-lg">
          {/* Brutalist Welcome Card */}
          <div className="relative">
            {/* Bold Border Frame */}
            <div className="absolute -inset-6 bg-black transform rotate-2"></div>
            <div className="absolute -inset-4 bg-yellow-400 transform -rotate-1"></div>
            
            {/* Main Container */}
            <div className="relative bg-white border-8 border-black p-8 transform rotate-0 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
              
              {/* Brutalist Header */}
              <div className="text-center mb-8">
                <div className="relative mb-6">
                  <div className="absolute -inset-3 bg-red-500 transform rotate-3"></div>
                  <div className="relative bg-white border-4 border-black p-6 text-center">
                    <div className="flex justify-center space-x-4 mb-4">
                      <div className="w-8 h-8 bg-blue-500 border-2 border-black transform rotate-45"></div>
                      <div className="w-8 h-8 bg-yellow-400 border-2 border-black rounded-full"></div>
                      <div className="w-8 h-8 bg-green-500 border-2 border-black" style={{clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'}}></div>
                    </div>
                    <span className="text-xl md:text-2xl font-black text-black uppercase tracking-wider">
                      WELCOME!
                    </span>
                  </div>
                </div>
                

              </div>

              {/* Brutalist Description */}
              <div className="relative mb-8">
                <div className="absolute -inset-2 bg-purple-500 transform rotate-1"></div>
                <div className="relative bg-white border-4 border-black p-6">
                  <p className="text-black font-bold text-lg text-center leading-tight uppercase tracking-wide">
                    TELL US YOUR NAME
                  </p>
                </div>
              </div>

              {/* Brutalist Input Field */}
              <div className="relative mb-8">
                <div className="absolute -inset-2 bg-blue-500 transform -rotate-1"></div>
                <div className="relative bg-white border-4 border-black">
                  <label className="block bg-black text-white text-xs font-bold px-3 py-2 uppercase tracking-widest">
                    YOUR NAME
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="TYPE HERE..."
                      value={data.name}
                      onChange={(e) => updateData({ name: e.target.value })}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      className={`w-full bg-white border-0 px-6 py-6 text-black placeholder-gray-500 font-mono text-xl font-bold uppercase tracking-wider focus:outline-none focus:ring-0 ${isFocused ? 'bg-yellow-100' : ''}`}
                      style={{ fontSize: "16px" }}
                    />
                    {data.name && (
                      <div className="absolute inset-y-0 right-4 flex items-center">
                        <div className="w-6 h-6 bg-green-500 border-2 border-black rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-black">✓</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Greeting */}
              {data.name && (
                <div className="relative">
                  <div className="absolute -inset-3 bg-green-500 transform rotate-2"></div>
                  <div className="absolute -inset-2 bg-black transform -rotate-1"></div>
                  <div className="relative bg-yellow-400 border-4 border-black p-6 text-center">
                    <div className="flex items-center justify-center space-x-3 mb-3">
                      <div className="w-4 h-4 bg-red-500 border-2 border-black"></div>
                      <div className="w-4 h-4 bg-blue-500 border-2 border-black rounded-full"></div>
                      <div className="w-4 h-4 bg-green-500 border-2 border-black" style={{clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'}}></div>
                    </div>
                    <p className="text-black font-black text-xl uppercase tracking-wider">
                      HELLO{' '}
                      <span className="text-red-500 text-2xl">{data.name.toUpperCase()}</span>!
                    </p>
                    <div className="mt-3 flex justify-center">
                      <div className="bg-black text-white px-4 py-2 text-sm font-bold uppercase tracking-wide">
                        READY FOR ADVENTURE?
                      </div>
                    </div>
                  </div>
                </div>
              )}


            </div>
          </div>
        </div>
      </div>

      {/* Brutalist Custom CSS */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-brutal {
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .text-shadow-brutal {
          text-shadow: 3px 3px 0px rgba(0,0,0,1);
        }

        .brutalist-input:focus {
          animation: brutalist-focus 0.3s ease-in-out;
        }

        @keyframes brutalist-focus {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  );
}