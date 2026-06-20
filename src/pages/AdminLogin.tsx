import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";

import uiClickSound from "../assets/audio/click.wav";
import uiHoverSound from "../assets/audio/hover.wav";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const playHoverSound = () => {
    const hoverSfx = new Audio(uiHoverSound);
    hoverSfx.volume = 0.2;
    hoverSfx.play().catch(() => {});
  };

  const playClickSound = () => {
    const clickSfx = new Audio(uiClickSound);
    clickSfx.volume = 0.5;
    clickSfx.play().catch(() => {});
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    
    try {
      const { data, error: fetchError } = await supabase
        .from('admin_profile')
        .select('*')
        .eq('username', 'admin')
        .single();

      if (fetchError || !data || data.password !== password) {
        setError(true);
        setTimeout(() => setError(false), 2000);
        return;
      }

      sessionStorage.setItem("isAdmin", "true");
      sessionStorage.setItem("adminData", JSON.stringify(data));
      navigate("/admin/dashboard");
    } catch (err) {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="relative h-[100dvh] w-full flex flex-col items-center justify-center overflow-hidden bg-black text-white">
      {/* Background Effect */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-900 to-black opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <Lock className="w-6 h-6 text-white/80" />
          </div>
          <h1 className="text-3xl tracking-widest uppercase font-light shine-effect" style={{ fontFamily: "'Inter', sans-serif" }}>
            Restricted Area
          </h1>
          <p className="text-white/40 mt-3 text-sm tracking-wider uppercase">Admin Access Only</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="relative group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Access Code"
              className={cn(
                "w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-center tracking-[0.3em] outline-none transition-all duration-300",
                "focus:bg-white/10 focus:border-white/30 placeholder:text-white/20",
                error && "border-red-500/50 bg-red-500/5"
              )}
            />
            {error && (
              <p className="absolute -bottom-6 left-0 right-0 text-center text-red-400 text-xs tracking-wider uppercase animate-fade-in">
                Access Denied
              </p>
            )}
          </div>

          <button
            type="submit"
            onMouseEnter={playHoverSound}
            className="group relative flex items-center justify-center w-full bg-white text-black rounded-xl py-4 font-medium uppercase tracking-widest overflow-hidden transition-transform duration-300 hover:scale-[1.02]"
          >
            <span className="relative z-10 flex items-center gap-2">
              Authenticate <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          </button>
        </form>
      </div>
    </div>
  );
}
