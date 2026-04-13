'use client';

import { motion } from 'motion/react';

export default function Loading() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]">
      {/* Primary Progress Bar */}
      <motion.div
        className="h-[3px] bg-primary relative"
        initial={{ width: '0%', opacity: 1 }}
        animate={{ 
          width: ['0%', '30%', '45%', '70%', '90%'],
          transition: {
            duration: 15,
            ease: "easeInOut",
            times: [0, 0.1, 0.3, 0.6, 1],
            repeat: Infinity,
            repeatDelay: 0.5
          }
        }}
      >
        {/* Glow Effect */}
        <div className="absolute top-0 right-0 h-full w-20 bg-gradient-to-r from-transparent to-primary blur-[4px] opacity-70" />
      </motion.div>

      {/* Subtle Background Track */}
      <div className="h-[3px] w-full bg-white/5 absolute top-0 left-0 -z-10" />
    </div>
  );
}
