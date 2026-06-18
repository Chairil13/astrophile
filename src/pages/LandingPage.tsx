import { useState, useRef, useEffect } from "react";
import { ArrowRight, Orbit } from "lucide-react";
import { cn } from "../lib/utils";
import { Link } from "react-router-dom";

import bgVideo from "../assets/background/background.mp4";
import bgVideo2 from "../assets/background/background2.mp4";
import bgAudio from "../assets/audio/audio.MP3";

const BACKGROUNDS = [bgVideo, bgVideo2];

function SeamlessVideo({ src, className, isActive = true }: { src: string, className?: string, isActive?: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const video0Ref = useRef<HTMLVideoElement>(null);
  const video1Ref = useRef<HTMLVideoElement>(null);
  const isTransitioning = useRef(false);

  useEffect(() => {
    if (isActive) {
      const activeVideo = activeIdx === 0 ? video0Ref.current : video1Ref.current;
      if (activeVideo && activeVideo.paused) {
        activeVideo.play().catch(() => { });
      }
    } else {
      video0Ref.current?.pause();
      video1Ref.current?.pause();
    }
  }, [isActive, activeIdx]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>, idx: number) => {
    const video = e.currentTarget;
    if (!video.duration || isTransitioning.current) return;

    if (idx === activeIdx && video.currentTime >= video.duration - 1.0) {
      isTransitioning.current = true;
      const nextIdx = idx === 0 ? 1 : 0;
      const nextVideo = nextIdx === 0 ? video0Ref.current : video1Ref.current;

      if (nextVideo) {
        nextVideo.currentTime = 0;
        nextVideo.play().catch(() => { });
        setActiveIdx(nextIdx);

        setTimeout(() => {
          isTransitioning.current = false;
        }, 1000);
      }
    }
  };

  return (
    <>
      <video ref={video0Ref} autoPlay={isActive} muted playsInline preload={isActive ? "auto" : "none"} onTimeUpdate={(e) => handleTimeUpdate(e, 0)}
        className={cn(className, "absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out", activeIdx === 0 ? "opacity-100" : "opacity-0")}
      >
        <source src={src} type="video/mp4" />
      </video>
      <video ref={video1Ref} muted playsInline preload="none" onTimeUpdate={(e) => handleTimeUpdate(e, 1)}
        className={cn(className, "absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out", activeIdx === 1 ? "opacity-100" : "opacity-0")}
      >
        <source src={src} type="video/mp4" />
      </video>
    </>
  );
}

function SeamlessAudio({ src, isPlaying = false }: { src: string, isPlaying?: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const audio0Ref = useRef<HTMLAudioElement>(null);
  const audio1Ref = useRef<HTMLAudioElement>(null);
  const isTransitioning = useRef(false);

  useEffect(() => {
    const activeAudio = activeIdx === 0 ? audio0Ref.current : audio1Ref.current;

    if (isPlaying) {
      if (activeAudio && activeAudio.paused) {
        // Simple fade-in when user clicks play
        activeAudio.volume = 0;
        activeAudio.play().catch(() => { });
        let vol = 0;
        const fadeInterval = setInterval(() => {
          vol = Math.min(1, vol + 0.05);
          if (activeAudio) activeAudio.volume = vol;
          if (vol >= 1) clearInterval(fadeInterval);
        }, 50);
      }
    } else {
      // Fade out both audios when user clicks pause
      [audio0Ref.current, audio1Ref.current].forEach(audio => {
        if (!audio || audio.paused) return;
        let vol = audio.volume;
        const fadeInterval = setInterval(() => {
          vol = Math.max(0, vol - 0.05);
          if (audio) audio.volume = vol;
          if (vol <= 0) {
            audio.pause();
            clearInterval(fadeInterval);
          }
        }, 50);
      });
    }
  }, [isPlaying, activeIdx]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>, idx: number) => {
    const audio = e.currentTarget;
    if (!audio.duration || isTransitioning.current || !isPlaying) return;

    const crossfadeDuration = 4.0; // 4 seconds crossfade for smoother transition

    if (idx === activeIdx && audio.currentTime >= audio.duration - crossfadeDuration) {
      isTransitioning.current = true;
      const nextIdx = idx === 0 ? 1 : 0;
      const nextAudio = nextIdx === 0 ? audio0Ref.current : audio1Ref.current;
      const currentAudio = audio;

      if (nextAudio) {
        nextAudio.currentTime = 0;
        nextAudio.volume = 0;
        nextAudio.play().catch(() => { });
        setActiveIdx(nextIdx);

        const steps = 40;
        const stepTime = (crossfadeDuration * 1000) / steps;
        let step = 0;

        const fadeInterval = setInterval(() => {
          if (!isPlaying) {
            clearInterval(fadeInterval);
            isTransitioning.current = false;
            return;
          }

          step++;
          const ratio = step / steps;

          if (currentAudio) currentAudio.volume = Math.max(0, 1 - ratio);
          if (nextAudio) nextAudio.volume = Math.min(1, ratio);

          if (step >= steps) {
            clearInterval(fadeInterval);
            if (currentAudio) {
              currentAudio.pause();
              currentAudio.currentTime = 0;
              currentAudio.volume = 1;
            }
            isTransitioning.current = false;
          }
        }, stepTime);
      }
    }
  };

  return (
    <>
      <audio ref={audio0Ref} src={src} preload={isPlaying ? "auto" : "none"} onTimeUpdate={(e) => handleTimeUpdate(e, 0)} />
      <audio ref={audio1Ref} src={src} preload="none" onTimeUpdate={(e) => handleTimeUpdate(e, 1)} />
    </>
  );
}


export default function LandingPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);

  const toggleAudio = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="relative h-[100dvh] w-full flex flex-col overflow-hidden bg-background">
      {/* Background Video Layers */}
      <div className="absolute inset-0 z-0 bg-black">
        {BACKGROUNDS.map((bg, index) => (
          <div key={bg} className={cn("absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out", bgIndex === index ? "opacity-100" : "opacity-0 pointer-events-none")}>
            <SeamlessVideo src={bg} isActive={bgIndex === index} className="w-full h-full object-cover object-[center_25%]" />
          </div>
        ))}
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none z-10" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex flex-col md:flex-row justify-between items-center px-6 md:px-8 py-4 md:py-6 w-full gap-4 md:gap-0">
        {/* Placeholder for left content if needed */}
        <div className="hidden md:block w-32"></div>

        {/* Center Logo */}
        <div className="md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
          <span className="text-xl logo-effect tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
            CHAIRIL
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            to="/tracker"
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md px-5 py-2.5 rounded-full transition-all duration-300 text-white/80 hover:text-white group"
          >
            <Orbit className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
            <span className="text-xs uppercase tracking-[0.2em] font-medium">3D ISS Tracker</span>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pb-20 md:pt-40 md:pb-12 w-full max-w-7xl mx-auto">
        <h1
          className="text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] max-w-7xl font-normal animate-fade-rise"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          <span className="shine-effect">
            A silent <em className="not-italic shine-effect-muted">voyage</em> above the <em className="not-italic shine-effect-muted">world.</em>
          </span>
        </h1>

        <p className="text-base sm:text-lg max-w-2xl mt-8 leading-relaxed animate-fade-rise-delay">
          <span className="shine-effect-muted shine-slow">
            Track the International Space Station in real-time with seamless 3D visualization.
          </span>
        </p>
      </main>

      {/* Background Audio */}
      <SeamlessAudio src={bgAudio} isPlaying={isPlaying} />

      {/* Next Background Orbital Button */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 animate-fade-rise-delay-2 flex flex-col items-center justify-center">
        <button
          onClick={() => setBgIndex((prev) => (prev + 1) % BACKGROUNDS.length)}
          className="relative group flex items-center justify-center rounded-full w-[120px] h-[120px] text-foreground hover:scale-[1.05] transition-all duration-500 cursor-pointer"
          aria-label="Next Background"
        >
          {/* Rotating Text SVG */}
          <div className="absolute inset-0 w-full h-full animate-spin-slow opacity-50 group-hover:opacity-100 transition-opacity duration-500">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <path id="circlePath" d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" fill="none" />
              <text className="text-[10px] uppercase tracking-[0.25em] fill-current font-light" style={{ fontFamily: "'Inter', sans-serif" }}>
                <textPath href="#circlePath" startOffset="0%">
                  CHANGE BACKGROUND • CHANGE BACKGROUND •
                </textPath>
              </text>
            </svg>
          </div>

          {/* Inner Icon */}
          <div className="absolute liquid-glass w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-white/10 transition-colors duration-500 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <ArrowRight className="w-5 h-5 opacity-80" strokeWidth={1.5} />
          </div>
        </button>
      </div>

      {/* Audio Toggle Button */}
      <button
        onClick={toggleAudio}
        className="fixed bottom-8 right-8 z-50 p-3 w-12 h-12 flex items-center justify-center rounded-full bg-white/5 text-foreground backdrop-blur-md hover:bg-white/10 transition-all border border-white/10 cursor-pointer"
        aria-label="Toggle background audio"
      >
        <div className={cn("flex items-center justify-center gap-[3px] h-5", isPlaying ? "playing" : "")}>
          <div className="sound-bar"></div>
          <div className="sound-bar"></div>
          <div className="sound-bar"></div>
          <div className="sound-bar"></div>
        </div>
      </button>
    </div>
  );
}
