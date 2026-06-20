import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { parseBlogContent } from "../lib/blogContent";

import uiClickSound from "../assets/audio/click.wav";
import uiHoverSound from "../assets/audio/hover.wav";

interface Blog {
  id: string;
  title: string;
  description: string;
  image_url: string;
  created_at: string;
}

export default function BlogDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBlog = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("Error fetching blog:", error);
      navigate("/blogs"); // Redirect back if not found
    } else {
      setBlog(data);
    }
    setIsLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    if (id) {
      queueMicrotask(fetchBlog);
    }
  }, [id, fetchBlog]);

  const playHoverSound = () => {
    const hoverSfx = new Audio(uiHoverSound);
    hoverSfx.volume = 0.2;
    hoverSfx.play().catch(() => { });
  };

  const playClickSound = () => {
    const clickSfx = new Audio(uiClickSound);
    clickSfx.volume = 0.5;
    clickSfx.play().catch(() => { });
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full bg-black text-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        <span className="tracking-widest uppercase text-sm text-white/40">Decrypting Transmission...</span>
      </div>
    );
  }

  if (!blog) return null;

  const contentBlocks = parseBlogContent(blog.description);

  return (
    <div className="min-h-[100dvh] w-full bg-black text-white relative overflow-hidden pb-20">
      {/* Background Hero Image with Gradient Overlay */}
      <div className="absolute top-0 w-full h-[60vh] z-0 pointer-events-none">
        <img
          src={blog.image_url}
          alt={blog.title}
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/80 to-black" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 pt-24">
        <Link
          to="/blogs"
          onClick={playClickSound}
          onMouseEnter={playHoverSound}
          className="inline-flex items-center gap-2 text-white/40 hover:text-white mb-10 transition-colors tracking-widest uppercase text-xs backdrop-blur-md bg-white/5 border border-white/10 px-4 py-2 rounded-full"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Archives
        </Link>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full">
              <span className="text-[10px] uppercase tracking-widest font-medium text-white/80">Log Entry</span>
            </div>
            <span className="text-sm tracking-wider uppercase text-white/40">
              {new Date(blog.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tighter uppercase shine-effect leading-[1.1]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {blog.title}
          </h1>
        </header>

        {/* Main Image */}
        <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 mb-16 shadow-[0_0_50px_rgba(255,255,255,0.05)] bg-white/5">
          <img
            src={blog.image_url}
            alt={blog.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="space-y-10">
          {contentBlocks.map((block, index) => {
            if (block.type === "image") {
              return (
                <figure
                  key={`${block.url}-${index}`}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_40px_rgba(255,255,255,0.04)]"
                >
                  <img
                    src={block.url}
                    alt={block.alt}
                    className="w-full object-cover"
                  />
                </figure>
              );
            }

            return (
              <p
                key={`${block.text}-${index}`}
                className="text-white/70 leading-relaxed font-light tracking-wide text-lg md:text-xl whitespace-pre-wrap"
              >
                {block.text}
              </p>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-20 pt-8 border-t border-white/10 flex items-center justify-between text-white/40 text-sm tracking-widest uppercase">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <span className="text-white font-bold tracking-tighter text-xs">AD</span>
            </div>
            <span>Admin</span>
          </div>
          <span>End of Blog</span>
        </div>
      </div>
    </div>
  );
}
