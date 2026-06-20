import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Plus, Trash2, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import AdminProfileModal from "../components/AdminProfileModal";

import uiClickSound from "../assets/audio/click.wav";
import uiHoverSound from "../assets/audio/hover.wav";

interface Blog {
  id: string;
  title: string;
  description: string;
  image_url: string;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);

  useEffect(() => {
    const auth = sessionStorage.getItem("isAdmin");
    const storedAdminData = sessionStorage.getItem("adminData");
    if (!auth || !storedAdminData) {
      navigate("/admin");
    } else {
      setAdminData(JSON.parse(storedAdminData));
      fetchBlogs();
    }
  }, [navigate]);

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

  const handleLogout = () => {
    playClickSound();
    sessionStorage.removeItem("isAdmin");
    navigate("/admin");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !imageFile) return;

    playClickSound();
    setIsUploading(true);

    try {
      // 1. Upload Image to Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      // 3. Insert into Database
      const { error: dbError } = await supabase
        .from('blogs')
        .insert([
          { title, description, image_url: publicUrl }
        ]);

      if (dbError) throw dbError;

      // Reset Form
      setTitle("");
      setDescription("");
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Refresh list
      fetchBlogs();

    } catch (error) {
      console.error("Error creating blog:", error);
      alert("Failed to upload blog post.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    playClickSound();
    if (!confirm("Are you sure you want to delete this blog?")) return;

    // Delete from DB
    await supabase.from('blogs').delete().eq('id', id);

    // Try to delete image from storage
    const pathParts = imageUrl.split('/');
    const fileName = pathParts[pathParts.length - 1];
    await supabase.storage.from('blog-images').remove([`public/${fileName}`]);

    fetchBlogs();
  };

  return (
    <div className="min-h-[100dvh] w-full bg-black text-white selection:bg-white/30">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
              {adminData?.avatar_url ? (
                <img src={adminData.avatar_url} alt="Admin" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold tracking-tighter">AD</span>
              )}
            </div>
            <div>
              <h1 className="font-semibold tracking-widest uppercase text-sm">{adminData?.name || "Admin Control"}</h1>
              <p className="text-xs text-white/40 tracking-wider">Astrophile Management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { playClickSound(); navigate("/"); }}
              onMouseEnter={playHoverSound}
              className="text-xs uppercase tracking-widest text-white/60 hover:text-white transition-colors"
            >
              Back to Site
            </button>
            <button
              onClick={() => { playClickSound(); setIsProfileOpen(true); }}
              onMouseEnter={playHoverSound}
              className="text-xs uppercase tracking-widest text-white/60 hover:text-white transition-colors"
            >
              Profile
            </button>
            <button 
              onClick={handleLogout}
              onMouseEnter={playHoverSound}
              className="flex items-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-full text-xs uppercase tracking-widest transition-all"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Form */}
        <div className="lg:col-span-5 space-y-8">
          <div>
            <h2 className="text-2xl font-light tracking-widest uppercase mb-2">New Entry</h2>
            <p className="text-white/40 text-sm">Publish a new transmission to the logs.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-white/60">Cover Image</label>
              <div 
                onClick={() => {
                  playClickSound();
                  fileInputRef.current?.click();
                }}
                onMouseEnter={playHoverSound}
                className={cn(
                  "relative w-full aspect-video rounded-xl border border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all hover:bg-white/10 hover:border-white/40",
                  imagePreview ? "border-solid border-white/20" : ""
                )}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-white/40">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-xs tracking-wider uppercase">Select File</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-xs uppercase tracking-widest bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">Change Image</span>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handleImageSelect}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-white/60">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-white/30 transition-colors"
                placeholder="Enter title..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-white/60">Description</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-white/30 transition-colors resize-none"
                placeholder="Enter detailed description..."
              />
            </div>

            <button
              type="submit"
              disabled={isUploading || !title || !description || !imageFile}
              onMouseEnter={playHoverSound}
              className="w-full flex items-center justify-center gap-2 bg-white text-black py-4 rounded-lg font-medium uppercase tracking-widest disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Transmitting...</>
              ) : (
                <><Upload className="w-4 h-4" /> Publish Entry</>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: List */}
        <div className="lg:col-span-7 space-y-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl font-light tracking-widest uppercase">Archive</h2>
            <span className="text-xs tracking-wider text-white/40">{blogs.length} Entries</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-white/40">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : blogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-white/20 border border-dashed border-white/10 rounded-xl">
              <p className="tracking-widest uppercase text-sm">No entries found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {blogs.map((blog) => (
                <div key={blog.id} className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <div className="aspect-video w-full overflow-hidden">
                    <img 
                      src={blog.image_url} 
                      alt={blog.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium truncate">{blog.title}</h3>
                    <p className="text-xs text-white/40 mt-1 truncate">{new Date(blog.created_at).toLocaleDateString()}</p>
                  </div>
                  
                  {/* Delete Button Overlay */}
                  <button
                    onClick={() => handleDelete(blog.id, blog.image_url)}
                    onMouseEnter={playHoverSound}
                    className="absolute top-3 right-3 bg-red-500/80 backdrop-blur text-white p-2 rounded-full opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AdminProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        adminData={adminData}
        onUpdate={(newData) => {
          setAdminData(newData);
          sessionStorage.setItem("adminData", JSON.stringify(newData));
        }}
      />
    </div>
  );
}
