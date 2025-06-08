import React, { useState } from "react";
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeStepProps {
  data: { name: string };
  updateData: (data: { name: string }) => void;
}

// Floating Particle Component
const FloatingParticle: React.FC<{ index: number }> = ({ index }) => {
  return (
    <motion.div
      className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
      initial={{ 
        scale: 0, 
        x: Math.random() * 300, 
        y: Math.random() * 400,
        opacity: 0
      }}
      animate={{
        scale: [0, 1, 0.5, 1, 0],
        x: [
          Math.random() * 300, 
          Math.random() * 300, 
          Math.random() * 300
        ],
        y: [
          Math.random() * 400, 
          Math.random() * 400, 
          Math.random() * 400
        ],
        opacity: [0, 1, 0.7, 1, 0]
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        repeat: Infinity,
        delay: index * 0.3,
        ease: "easeInOut"
      }}
    />
  );
};

export default function WelcomeStep({ data, updateData }: WelcomeStepProps) {
  const [isFocused, setIsFocused] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 20, 
      scale: 0.8 
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const iconVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0, 
      rotate: 180 
    },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: i * 0.1
      }
    }),
    hover: {
      scale: 1.2,
      rotate: 15,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    }
  };

  const greetingVariants = {
    hidden: {
      opacity: 0,
      scale: 0,
      rotate: 180,
      y: 50
    },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15,
        duration: 0.6
      }
    },
    exit: {
      opacity: 0,
      scale: 0,
      rotate: -180,
      transition: {
        duration: 0.3
      }
    }
  };

  const celebrationVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: (i: number) => ({
      opacity: [0, 1, 0],
      scale: [0, 1, 0],
      x: [0, (i - 4) * 30, (i - 4) * 60],
      y: [0, -20, -40],
      transition: {
        duration: 1.5,
        ease: "easeOut",
        delay: i * 0.1
      }
    })
  };

  const icons = ['👋', '✨', '🎌'];

  return (
    <motion.div 
      className="relative min-h-[400px] flex flex-col items-center justify-center space-y-8 p-6 overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      
      {/* Floating Particles Background */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <FloatingParticle key={i} index={i} />
        ))}
      </div>

      {/* Main Container */}
      <motion.div 
        className="relative z-10 text-center space-y-8 max-w-md w-full"
        variants={containerVariants}
      >
        
        {/* Animated Icons */}
        <motion.div 
          className="flex items-center justify-center space-x-6 mb-8"
          variants={itemVariants}
        >
          {icons.map((icon, index) => (
            <motion.div
              key={index}
              className="text-5xl cursor-pointer select-none"
              variants={iconVariants}
              custom={index}
              whileHover="hover"
              whileTap={{ scale: 0.9 }}
            >
              {icon}
            </motion.div>
          ))}
        </motion.div>

        {/* Epic Header */}
        <motion.h3 
          className="text-3xl sm:text-4xl font-bold text-white"
          variants={itemVariants}
          whileHover={{ 
            scale: 1.05,
            transition: { type: "spring", stiffness: 300 }
          }}
        >
          <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-yellow-400 bg-clip-text text-transparent">
            Welcome to AniMuse!
          </span>
        </motion.h3>
        
        {/* Description */}
        <motion.div 
          className="relative"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
        >
          <motion.div 
            className="absolute -inset-4 bg-gradient-to-r from-pink-500/30 to-blue-500/30 rounded-3xl blur-xl opacity-60"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <div className="relative bg-black/40 backdrop-blur-lg border border-white/20 rounded-3xl p-6 shadow-2xl">
            <p className="text-white/90 text-lg leading-relaxed">
              Let's get to know you to create your perfect anime journey.
              <br />
              <motion.span 
                className="text-yellow-400 font-semibold text-xl"
                animate={{ 
                  textShadow: [
                    "0 0 0px rgba(251, 191, 36, 0)",
                    "0 0 10px rgba(251, 191, 36, 0.5)",
                    "0 0 0px rgba(251, 191, 36, 0)"
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                What should we call you?
              </motion.span>
            </p>
          </div>
        </motion.div>

        {/* Epic Input Field */}
        <motion.div 
          className="relative"
          variants={itemVariants}
        >
          <motion.div
            className="absolute -inset-3 bg-gradient-to-r from-blue-500/50 to-purple-500/50 rounded-3xl blur-xl"
            animate={{ 
              opacity: isFocused ? 1 : 0,
              scale: isFocused ? 1.1 : 1
            }}
            transition={{ duration: 0.3 }}
          />
          
          <motion.div 
            className="relative group"
            animate={{
              scale: isFocused ? 1.02 : 1,
              boxShadow: isFocused 
                ? "0 0 30px rgba(59, 130, 246, 0.5)" 
                : "0 0 0px rgba(59, 130, 246, 0)"
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
          >
            <motion.div 
              className="absolute inset-y-0 left-5 flex items-center pointer-events-none"
              animate={{
                scale: data.name ? [1, 1.2, 1] : 1
              }}
              transition={{
                duration: 0.5,
                repeat: data.name ? Infinity : 0,
                repeatType: "reverse"
              }}
            >
              <div className="text-3xl">
                {data.name ? '😊' : '👤'}
              </div>
            </motion.div>
            
            <input
              type="text"
              placeholder="Your Nickname"
              value={data.name}
              onChange={(e) => updateData({ name: e.target.value })}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full bg-black/50 backdrop-blur-lg border-2 border-white/30 rounded-3xl pl-20 pr-8 py-5 text-white text-center text-xl font-medium placeholder-white/60 focus:border-blue-400 focus:outline-none transition-all duration-300 shadow-2xl"
              style={{ fontSize: "16px" }}
            />
          </motion.div>
        </motion.div>

        {/* Dynamic Greeting with Celebration */}
        <AnimatePresence>
          {data.name && (
            <motion.div 
              className="relative"
              variants={greetingVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Celebration Particles */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-full top-1/2 left-1/2"
                    variants={celebrationVariants}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                  />
                ))}
              </div>
              
              <motion.div 
                className="absolute -inset-4 bg-gradient-to-r from-green-500/40 to-emerald-400/40 rounded-3xl blur-xl opacity-80"
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <div className="relative bg-gradient-to-r from-green-500/30 to-emerald-400/30 backdrop-blur-lg border-2 border-green-400/50 rounded-3xl p-6 shadow-2xl">
                <motion.div 
                  className="flex items-center justify-center space-x-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.span 
                    className="text-3xl"
                    animate={{ 
                      rotate: [0, 15, -15, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    🎉
                  </motion.span>
                  <p className="text-white font-semibold text-xl">
                    Amazing to meet you,{' '}
                    <motion.span 
                      className="text-yellow-400 font-bold text-2xl"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ 
                        delay: 0.5,
                        type: "spring",
                        stiffness: 200
                      }}
                    >
                      {data.name}
                    </motion.span>!
                  </p>
                  <motion.span 
                    className="text-3xl"
                    animate={{ 
                      rotate: [0, -15, 15, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5
                    }}
                  >
                    ✨
                  </motion.span>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}