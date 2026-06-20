import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Trash2, Upload, Loader2, Image as ImageIcon, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import { getBlogExcerpt, getBlogImageUrls } from "../lib/blogContent";
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

interface AdminData {
  id: string;
  username: string;
  name: string;
  avatar_url?: string;
  password?: string;
}

const getStoredAdminData = () => {
  const storedAdminData = sessionStorage.getItem("adminData");
  return storedAdminData ? JSON.parse(storedAdminData) as AdminData : null;
};

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
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [isUploadingContentImage, setIsUploadingContentImage] = useState(false);

  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [adminData, setAdminData] = useState<AdminData | null>(getStoredAdminData);

  const fetchBlogs = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setBlogs(data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const auth = sessionStorage.getItem("isAdmin");
    const storedAdminData = getStoredAdminData();
    if (!auth || !storedAdminData) {
      navigate("/admin");
      return;
    }

    queueMicrotask(fetchBlogs);
  }, [navigate, fetchBlogs]);

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

  const uploadBlogImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('blog-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('blog-images')
      .getPublicUrl(filePath);

    return { publicUrl, filePath };
  };

  const handleContentImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playClickSound();
    setIsUploadingContentImage(true);

    try {
      const { publicUrl } = await uploadBlogImage(file);
      const imageMarkup = `\n\n![${file.name.replace(/\.[^/.]+$/, "")}](${publicUrl})\n\n`;
      const textarea = descriptionRef.current;
      const cursorPosition = textarea?.selectionStart ?? description.length;
      const nextDescription =
        description.slice(0, cursorPosition) +
        imageMarkup +
        description.slice(cursorPosition);

      setDescription(nextDescription);

      requestAnimationFrame(() => {
        const nextCursor = cursorPosition + imageMarkup.length;
        descriptionRef.current?.focus();
        descriptionRef.current?.setSelectionRange(nextCursor, nextCursor);
      });
    } catch (error) {
      console.error("Error inserting content image:", error);
      alert("Failed to insert image into description.");
    } finally {
      setIsUploadingContentImage(false);
      if (contentImageInputRef.current) contentImageInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !imageFile) return;

    playClickSound();
    setIsUploading(true);

    try {
      // 1. Upload Image to Supabase Storage
      const { publicUrl } = await uploadBlogImage(imageFile);

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
    const blog = blogs.find((entry) => entry.id === id);
    const storageUrls = [imageUrl, ...getBlogImageUrls(blog?.description ?? "")];
    const storagePaths = storageUrls.map((url) => {
      const pathParts = url.split('/');
      const fileName = pathParts[pathParts.length - 1];
      return `public/${fileName}`;
    });
    await supabase.storage.from('blog-images').remove(storagePaths);

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
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs uppercase tracking-widest text-white/60">Description</label>
                <button
                  type="button"
                  onClick={() => contentImageInputRef.current?.click()}
                  onMouseEnter={playHoverSound}
                  disabled={isUploadingContentImage}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-white/70 transition-colors hover:border-white/30 hover:bg-white/10 disabled:opacity-50"
                >
                  {isUploadingContentImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Insert Image
                </button>
              </div>
              <textarea
                ref={descriptionRef}
                required
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-white/30 transition-colors resize-none"
                placeholder="Write paragraph, insert image, then continue below it..."
              />
              <input
                type="file"
                ref={contentImageInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleContentImageSelect}
              />
              {getBlogImageUrls(description).length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {getBlogImageUrls(description).map((url) => (
                    <div key={url} className="aspect-video overflow-hidden rounded-lg border border-white/10 bg-white/5">
                      <img src={url} alt="Inserted description media" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
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
                    <p className="text-xs text-white/40 mt-1 truncate">{getBlogExcerpt(blog.description) || new Date(blog.created_at).toLocaleDateString()}</p>
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
