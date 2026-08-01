import { useEffect, useRef } from "react";
import gsap from "gsap";

interface SplashScreenProps {
  onComplete: () => void;
  collegeName?: string;
}

// Web Audio API for sounds
function createAudioContext() {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

function playFlipSound(ctx: AudioContext, index: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80 + index * 20, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}


function playTVShutdownSound(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = "square";
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.3);
  
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}

const SplashScreen = ({ onComplete, collegeName = "LJCCA" }: SplashScreenProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const tvScreenRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = createAudioContext();
    } else if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };

  useEffect(() => {
    // Try to auto-start audio, otherwise bind to first interaction
    try { initAudio(); } catch {
      document.addEventListener("click", initAudio, { once: true });
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setTimeout(onComplete, 400);
      }
    });

    gsap.set(containerRef.current, { backgroundColor: "#000", perspective: 800 });
    gsap.set(lettersRef.current, { opacity: 0, rotationY: -90, transformOrigin: "center center -150" });

    // 2. Letters flip in one by one
    lettersRef.current.forEach((el, index) => {
      if (el) {
        tl.to(el, {
          opacity: 1,
          rotationY: 0,
          duration: 0.8,
          ease: "back.out(1.2)",
          onStart: () => {
            if (audioCtxRef.current) {
              try { playFlipSound(audioCtxRef.current, index); } catch {}
            }
          }
        }, "+=0.15");
      }
    });

    tl.to({}, { duration: 1.2 });

    tl.add(() => {
      if (audioCtxRef.current) {
        try { playTVShutdownSound(audioCtxRef.current); } catch {}
      }
    });

    tl.to(tvScreenRef.current, {
      scaleY: 0.005,
      backgroundColor: "#ffffff",
      duration: 0.25,
      ease: "power2.in",
    });

    tl.to(tvScreenRef.current, {
      scaleX: 0,
      opacity: 0,
      duration: 0.3,
      ease: "power3.out",
    });

    return () => { tl.kill(); };
  }, [onComplete]);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden"
    >
      <div 
        ref={tvScreenRef} 
        className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden"
        style={{ transformOrigin: "center center" }}
      >
        <div className="flex gap-4 md:gap-8">
          {collegeName.split("").map((letter, i) => {
            const isLJ = letter.toUpperCase() === 'L' || letter.toUpperCase() === 'J';
            const glowColor = isLJ ? "hsl(0, 80%, 65%)" : (i % 2 === 0 ? "hsl(245, 80%, 65%)" : "hsl(175, 70%, 65%)");
            return (
              <span
                key={i}
                ref={el => lettersRef.current[i] = el}
                className="font-black text-transparent bg-clip-text"
                style={{
                  fontSize: "clamp(5rem, 15vw, 15rem)",
                  fontFamily: "'Inter', sans-serif",
                  backgroundImage: isLJ 
                    ? "linear-gradient(180deg, #ffffff 0%, hsl(0, 80%, 65%) 100%)"
                    : (i % 2 === 0 
                      ? "linear-gradient(180deg, #ffffff 0%, hsl(245, 80%, 65%) 100%)"
                      : "linear-gradient(180deg, #ffffff 0%, hsl(175, 70%, 65%) 100%)"),
                  filter: `drop-shadow(0 0 15px ${glowColor}) drop-shadow(0 0 40px ${glowColor})`
                }}
              >
                {letter}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
