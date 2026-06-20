import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, ArrowUpRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

import uiClickSound from "../assets/audio/click.wav";
import uiHoverSound from "../assets/audio/hover.wav";

interface Blog {
  id: string;
  title: string;
  description: string;
  image_url: string;
  created_at: string;
}

export default function Blogs() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setBlogs(data);
    }
    setIsLoading(false);
  };

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

  return (
    <div className="min-h-[100dvh] w-full bg-black text-white relative overflow-hidden">
      {/* Background Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-black to-black" />
        <div className="absolute top-0 w-full h-[500px] bg-gradient-to-b from-white/[0.02] to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-8 mb-12">
          <div>
            <Link 
              to="/" 
              onClick={playClickSound}
              onMouseEnter={playHoverSound}
              className="inline-flex items-center gap-2 text-white/40 hover:text-white mb-6 transition-colors tracking-widest uppercase text-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Base
            </Link>
            <h1 className="text-4xl md:text-6xl font-light tracking-tighter uppercase shine-effect" style={{ fontFamily: "'Inter', sans-serif" }}>
              Blogs
            </h1>
            <p className="text-white/40 mt-4 max-w-md">Chronicles of the sky, space exploration, and our silent voyage above the world.</p>
          </div>
        </header>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/40 gap-4">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="tracking-widest uppercase text-sm">Receiving Data...</span>
          </div>
        ) : blogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/20 border border-dashed border-white/10 rounded-2xl">
            <p className="tracking-widest uppercase text-sm">No blogs found in archive.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <Link 
                to={`/blogs/${blog.id}`}
                key={blog.id} 
                onClick={playClickSound}
                className="group relative flex flex-col bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden hover:bg-white/[0.04] transition-all duration-500 hover:border-white/20"
                onMouseEnter={playHoverSound}
              >
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-black/50">
                  <img 
                    src={blog.image_url} 
                    alt={blog.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full">
                    <span className="text-[10px] uppercase tracking-widest font-medium">Log Entry</span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1 relative">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <h2 className="text-xl font-medium leading-snug group-hover:text-white/90 transition-colors">
                      {blog.title}
                    </h2>
                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white group-hover:text-black transition-all duration-300">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                  
                  <p className="text-white/40 text-sm leading-relaxed line-clamp-3 mb-6 flex-1">
                    {blog.description}
                  </p>
                  
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs tracking-wider uppercase text-white/40">
                    <span>{new Date(blog.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <span>Admin</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
