import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Volume2, VolumeX } from "lucide-react";

interface ModernSplashScreenProps { onComplete: () => void; }

function getAudioContext() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}

function playFlipSound(context: AudioContext, index: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(180 + index * 55, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(72 + index * 18, context.currentTime + 0.2);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);
  oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.5);
}

const revealLetters = ["L", "J", "C", "C", "A"];
const scrambleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const ModernSplashScreen = ({ onComplete }: ModernSplashScreenProps) => {
  const screenRef = useRef<HTMLDivElement>(null);
  const objectRef = useRef<SVGGElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const progressRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(false);
  const [soundOn, setSoundOn] = useState(true);

  const startSound = () => {
    try {
      if (!audioRef.current) audioRef.current = getAudioContext();
      if (!audioRef.current) return;
      if (audioRef.current.state === "suspended") void audioRef.current.resume();
      soundOnRef.current = true;
      setSoundOn(true);
    } catch { soundOnRef.current = false; setSoundOn(false); }
  };

  const toggleSound = () => {
    if (soundOn) { soundOnRef.current = false; setSoundOn(false); return; }
    startSound();
  };

  useEffect(() => {
    const screen = screenRef.current;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onComplete();
    };
    const fallbackTimer = window.setTimeout(finish, 6500);
    startSound();
    const timeline = gsap.timeline({ onComplete: () => window.setTimeout(finish, 260) });
    const randomChar = () => scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
    timeline.fromTo(screen, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" });
    timeline.fromTo(".launch-kicker, .launch-subtitle", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: "power3.out" }, "-=0.1");
    timeline.fromTo(objectRef.current, { opacity: 0, scale: 0.72, rotation: -12 }, { opacity: 1, scale: 1, rotation: 0, duration: 1.15, ease: "expo.out" }, "-=0.55");
    timeline.fromTo(".launch-orbit", { opacity: 0, scale: 0.72 }, { opacity: 1, scale: 1, duration: 1.2, stagger: 0.1, ease: "power3.out" }, "-=0.9");
    gsap.set(letterRefs.current, { opacity: 0, rotationY: -90, y: 12, transformOrigin: "center center -80" });
    letterRefs.current.forEach((letter, index) => {
      if (!letter) return;
      timeline.to(letter, {
        opacity: 1,
        rotationY: 0,
        y: 0,
        duration: 0.68,
        ease: "back.out(1.5)",
        onStart: () => { if (audioRef.current && soundOnRef.current) playFlipSound(audioRef.current, index); },
        onUpdate: function () {
          if (this.progress() < 0.72) letter.textContent = randomChar();
          else letter.textContent = revealLetters[index];
        },
        onComplete: () => { letter.textContent = revealLetters[index]; },
      }, index === 0 ? "-=0.6" : "+=0.16");
    });
    timeline.fromTo(progressRef.current, { width: "0%" }, { width: "100%", duration: 2.8, ease: "power1.inOut" }, "-=0.4");
    timeline.to(".launch-content", { opacity: 0, y: -12, duration: 0.35, ease: "power2.in" }, "+=0.12");
    timeline.to(screen, { opacity: 0, duration: 0.4, ease: "power2.in" });
    return () => { window.clearTimeout(fallbackTimer); timeline.kill(); if (audioRef.current) void audioRef.current.close(); };
  }, [onComplete]);

  return (
    <div ref={screenRef} className="launch-screen" onPointerDown={() => { if (soundOnRef.current) startSound(); }}>
      <svg className="launch-bg" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id="launch-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#eef2f5" strokeOpacity=".07" /></pattern>
          <radialGradient id="launch-light"><stop stopColor="#78d7ff" stopOpacity=".22" /><stop offset="1" stopColor="#78d7ff" stopOpacity="0" /></radialGradient>
          <linearGradient id="launch-line" x1="0" x2="1"><stop stopColor="#ff725e" stopOpacity="0" /><stop offset=".5" stopColor="#78d7ff" stopOpacity=".85" /><stop offset="1" stopColor="#c9f26d" stopOpacity="0" /></linearGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#launch-grid)" /><circle cx="1050" cy="220" r="330" fill="url(#launch-light)" />
        <path d="M-80 730C250 530 330 840 690 570S1130 350 1530 520" fill="none" stroke="url(#launch-line)" strokeWidth="1" /><path d="M-80 770C250 570 350 870 720 610S1160 390 1530 560" fill="none" stroke="url(#launch-line)" strokeOpacity=".35" />
      </svg>
      <button className="launch-sound" onClick={toggleSound} title={soundOn ? "Mute launch sound" : "Enable launch sound"} aria-label={soundOn ? "Mute launch sound" : "Enable launch sound"}>{soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}<span>{soundOn ? "sound on" : "sound off"}</span></button>
      <div className="launch-content">
        <div className="launch-kicker"><span /> SYSTEM ONLINE <span /></div>
        <div className="launch-art" aria-hidden="true">
          <svg className="launch-orbit orbit-a" viewBox="0 0 520 360"><ellipse cx="260" cy="180" rx="228" ry="74" /><ellipse cx="260" cy="180" rx="228" ry="74" transform="rotate(60 260 180)" /><ellipse cx="260" cy="180" rx="228" ry="74" transform="rotate(-60 260 180)" /></svg>
          <svg className="launch-orbit orbit-b" viewBox="0 0 520 360"><ellipse cx="260" cy="180" rx="190" ry="52" /><ellipse cx="260" cy="180" rx="190" ry="52" transform="rotate(90 260 180)" /></svg>
          <svg className="launch-object" viewBox="0 0 480 360">
            <defs><linearGradient id="cube-top" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#eaf8ff" /><stop offset="1" stopColor="#78d7ff" /></linearGradient><linearGradient id="cube-left" x1="0" x2="1"><stop stopColor="#ff725e" /><stop offset="1" stopColor="#c9434f" /></linearGradient><linearGradient id="cube-right" x1="0" x2="1"><stop stopColor="#c9f26d" /><stop offset="1" stopColor="#5a8f51" /></linearGradient><filter id="object-shadow"><feGaussianBlur stdDeviation="15" /></filter></defs>
            <ellipse cx="240" cy="296" rx="128" ry="18" fill="#030609" opacity=".5" filter="url(#object-shadow)" />
            <g ref={objectRef}><path d="M240 62 365 133 240 205 115 133Z" fill="url(#cube-top)" stroke="#eefcff" strokeOpacity=".75" strokeWidth="2" /><path d="M115 133 240 205 240 322 115 248Z" fill="url(#cube-left)" stroke="#ffb0a4" strokeOpacity=".55" strokeWidth="2" /><path d="M365 133 240 205 240 322 365 248Z" fill="url(#cube-right)" stroke="#e8ffad" strokeOpacity=".55" strokeWidth="2" /><path d="M240 62 240 205M178 98 302 170M115 133 240 205 365 133M178 170 240 205 302 170M178 286 178 170M302 286 302 170" fill="none" stroke="#12171f" strokeOpacity=".25" strokeWidth="2" /><circle cx="240" cy="205" r="22" fill="#12171f" fillOpacity=".86" /><path d="m240 194 9 6v11l-9 6-9-6v-11Z" fill="#c9f26d" /></g>
          </svg>
        </div>
        <h1 className="launch-title" aria-label="LJCCA">{revealLetters.map((letter, index) => <span key={`${letter}-${index}`} ref={(element) => { letterRefs.current[index] = element; }} className={index < 2 ? "launch-letter-red" : "launch-letter-white"}>{scrambleChars[index * 7]}</span>)}</h1><p className="launch-subtitle">A clearer rhythm for every campus.</p><div className="launch-progress"><div ref={progressRef} /></div><div className="launch-meta"><span>BUILD 03.01</span><span>PREPARING WORKSPACE</span><span>READY</span></div>
      </div>
    </div>
  );
};

export default ModernSplashScreen;
