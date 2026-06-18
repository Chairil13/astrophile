import { useState, useEffect, useRef } from "react";
import Globe from "react-globe.gl";
import type { GlobeMethods } from "react-globe.gl";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import bgVideo from "../assets/background/background.mp4"; // Cinematic background

interface ISSData {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
}

interface CountryData {
  name: string;
  code: string;
}

export default function ISSTracker3D() {
  const [issData, setIssData] = useState<ISSData | null>(null);
  const [path, setPath] = useState<{ lat: number, lng: number }[]>([]);
  const [country, setCountry] = useState<CountryData | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const isFirstLoad = useRef(true);

  // Add realistic clouds layer using Three.js and configure Auto Rotate
  useEffect(() => {
    if (!globeRef.current) return;
    
    // Disable auto-rotation as requested, but keep damping for smooth manual interaction
    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = false;
      controls.enableDamping = true;
    }

    let clouds: any = null;
    let animationFrameId: number;

    import("three").then(THREE => {
      const CLOUDS_IMG_URL = "//unpkg.com/three-globe/example/img/earth-clouds10k.png";
      new THREE.TextureLoader().load(CLOUDS_IMG_URL, (cloudsTexture: any) => {
        clouds = new THREE.Mesh(
          new THREE.SphereGeometry(100.5, 75, 75), // 100 is default globe radius
          new THREE.MeshPhongMaterial({ 
            map: cloudsTexture, 
            transparent: true, 
            opacity: 0.6, // Increased slightly for realistic satellite cloud cover
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
          })
        );
        globeRef.current?.scene().add(clouds);

        const rotateClouds = () => {
          if (clouds) {
            clouds.rotation.y += 0.0003; // Slowly rotate clouds
          }
          if (controls) {
            controls.update(); // Required for damping and autoRotate
          }
          animationFrameId = requestAnimationFrame(rotateClouds);
        };
        rotateClouds();
      });
    });

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (clouds && globeRef.current) {
        globeRef.current.scene().remove(clouds);
      }
    };
  }, []);

  // Fetch Full Orbit Path (Past 45 minutes) once on load
  useEffect(() => {
    const fetchOrbitPath = async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const timestamps = [];
        // The API allows a maximum of 10 timestamps per request.
        // We fetch past 45 minutes, every 5 minutes (10 points total)
        for (let i = -45; i <= 0; i += 5) {
          timestamps.push(now + i * 60);
        }
        
        const response = await fetch(`https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=${timestamps.join(',')}`);
        if (response.ok) {
          const data = await response.json();
          const orbitCoords = data.map((pos: any) => ({ lat: pos.latitude, lng: pos.longitude }));
          setPath(orbitCoords);
        }
      } catch (error) {
        console.error("Error fetching orbit path:", error);
      }
    };

    fetchOrbitPath();
  }, []);

  // Fetch ISS Data & Reverse Geocoding
  useEffect(() => {
    const fetchISSData = async () => {
      try {
        const response = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
        if (response.ok) {
          const data = await response.json();
          setIssData(data);

          setPath(prev => {
            // Avoid adding duplicate points if the position hasn't changed much
            const lastPoint = prev[prev.length - 1];
            if (lastPoint && Math.abs(lastPoint.lat - data.latitude) < 0.001 && Math.abs(lastPoint.lng - data.longitude) < 0.001) {
              return prev;
            }
            const newPath = [...prev, { lat: data.latitude, lng: data.longitude }];
            if (newPath.length > 100) newPath.shift(); // Keep a long tail
            return newPath;
          });

          // Only force the camera on the very first load to prevent stiffness
          if (globeRef.current && isFirstLoad.current) {
            globeRef.current.pointOfView({ lat: data.latitude, lng: data.longitude, altitude: 2 }, 2000);
            isFirstLoad.current = false;
          }

          // Reverse Geocoding
          const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${data.latitude}&longitude=${data.longitude}&localityLanguage=en`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.countryName && geoData.countryCode) {
              setCountry({ name: geoData.countryName, code: geoData.countryCode });
            } else {
              setCountry(null); // Indicates Ocean/International waters
            }
          }
        }
      } catch (error) {
        console.error("Error fetching ISS data:", error);
      }
    };

    fetchISSData();
    const interval = setInterval(fetchISSData, 3000);
    return () => clearInterval(interval);
  }, []);

  const pathsData = path.length > 1 ? [{ coords: path }] : [];

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black font-sans">
      {/* Background Video Layer */}
      <div className="absolute inset-0 z-0">
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-30">
          <source src={bgVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50 pointer-events-none z-10" />
      </div>

      {/* Navigation Bar */}
      <nav className="absolute top-0 left-0 w-full z-30 flex flex-row justify-between items-start md:items-center px-4 md:px-8 py-4 md:py-6 pointer-events-auto">
        <Link 
          to="/"
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md p-3 md:px-5 md:py-2.5 rounded-full transition-all duration-300 text-white/80 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5 md:w-4 md:h-4" />
          <span className="hidden md:inline text-xs uppercase tracking-[0.2em] font-medium">Back</span>
        </Link>
      </nav>

      {/* Top Center Mobile / Top Left Desktop: Telemetry Dashboard */}
      <div className="absolute top-4 md:top-24 left-1/2 md:left-8 -translate-x-1/2 md:translate-x-0 z-20 pointer-events-none w-[85%] md:w-auto">
        <div className="backdrop-blur-md bg-black/40 border border-white/10 rounded-2xl p-3 md:p-5 flex flex-row md:flex-col justify-between md:justify-start gap-2 md:gap-4 min-w-0 md:min-w-[200px]">
          <div className="hidden md:flex items-center gap-3 mb-2">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </div>
            <span className="text-[10px] tracking-[0.3em] font-medium text-white/80 uppercase">Telemetry</span>
          </div>

          <div className="flex flex-col items-center md:items-start flex-1 md:flex-none">
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-white/50 mb-0.5">Lat</span>
            <span className="text-xs md:text-lg font-light tabular-nums" style={{ fontFamily: "'Inter', sans-serif" }}>
              {issData ? `${issData.latitude.toFixed(2)}°` : "..."}
            </span>
          </div>
          <div className="flex flex-col items-center md:items-start flex-1 md:flex-none border-l border-white/10 md:border-0">
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-white/50 mb-0.5">Lng</span>
            <span className="text-xs md:text-lg font-light tabular-nums" style={{ fontFamily: "'Inter', sans-serif" }}>
              {issData ? `${issData.longitude.toFixed(2)}°` : "..."}
            </span>
          </div>
          <div className="flex flex-col items-center md:items-start flex-1 md:flex-none border-l border-white/10 md:border-0">
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-white/50 mb-0.5">Alt</span>
            <span className="text-xs md:text-lg font-light tabular-nums flex items-baseline gap-1" style={{ fontFamily: "'Inter', sans-serif" }}>
              {issData ? Math.round(issData.altitude) : "..."} <span className="text-[8px] md:text-[10px] font-normal text-white/50">km</span>
            </span>
          </div>
          <div className="flex flex-col items-center md:items-start flex-1 md:flex-none border-l border-white/10 md:border-0">
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-white/50 mb-0.5">Vel</span>
            <span className="text-xs md:text-lg font-light tabular-nums flex items-baseline gap-1" style={{ fontFamily: "'Inter', sans-serif" }}>
              {issData ? Math.round(issData.velocity) : "..."} <span className="text-[8px] md:text-[10px] font-normal text-white/50">km/h</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3D Globe Container */}
      <div className="absolute inset-0 z-10 cursor-move">
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg" // True satellite imagery
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          showAtmosphere={true}
          atmosphereColor="#3a86ff"
          atmosphereAltitude={0.12} // Thinner, more realistic atmospheric glow
          
          // Current Position Marker (Animated Glowing Dot / Radar)
          htmlElementsData={issData ? [issData] : []}
          htmlLat="latitude"
          htmlLng="longitude"
          htmlElement={() => {
            const el = document.createElement('div');
            // react-globe.gl automatically centers the element, so no negative translation is needed
            el.innerHTML = `
              <div class="relative flex items-center justify-center w-10 h-10">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50 duration-1000"></span>
                <div class="relative w-3 h-3 bg-white border-2 border-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,1)]"></div>
              </div>
            `;
            return el;
          }}
          
          // Orbit Path
          pathsData={pathsData}
          pathPoints="coords"
          pathPointLat="lat"
          pathPointLng="lng"
          pathColor={() => 'rgba(34, 197, 94, 0.8)'} // Glowing green
          pathPointAlt={0.02}
          pathTransitionDuration={0} // Disable animation to prevent flickering when updating path
        />
      </div>

      {/* Bottom Left: Country Tracking */}
      <div className="absolute bottom-12 left-10 z-20 pointer-events-none">
        <span className="text-sm text-white/60 mb-2 block font-light tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>
          Currently over
        </span>
        <div className="flex items-center gap-5">
          {country?.code && (
            <img 
              src={`https://flagcdn.com/w80/${country.code.toLowerCase()}.png`} 
              alt={country.name}
              className="w-14 h-10 rounded shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 object-cover"
            />
          )}
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {country?.name || "Ocean"}
          </h2>
        </div>
      </div>

      {/* Bottom Right: Live Video Stream */}
      <div className="absolute bottom-10 right-10 z-20 w-80 md:w-96 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 bg-black/60 backdrop-blur-xl pointer-events-auto">
        <div className="px-5 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] text-white/90 uppercase tracking-[0.2em] font-medium">Live Feed</span>
          </div>
          <span className="text-[10px] text-white/50 tracking-wider">NASA / SEN</span>
        </div>
        <div className="relative w-full aspect-video pointer-events-auto bg-black">
          <iframe 
            width="100%" 
            height="100%" 
            src="https://www.youtube.com/embed/fO9e9jnhYK8?autoplay=1&mute=1" 
            title="Live Earth from Space" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
            className="border-0"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
