import { useState, useRef } from "react";
import { X, Upload, Loader2, User } from "lucide-react";
import { supabase } from "../lib/supabase";


import uiClickSound from "../assets/audio/click.wav";
import uiHoverSound from "../assets/audio/hover.wav";

interface AdminData {
  id: string;
  username: string;
  name: string;
  avatar_url?: string;
  password?: string;
}

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminData: AdminData | null;
  onUpdate: (data: AdminData) => void;
}

export default function AdminProfileModal({ isOpen, onClose, adminData, onUpdate }: AdminProfileModalProps) {
  const [name, setName] = useState(adminData?.name || "");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(adminData?.avatar_url || null);
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !adminData) return null;

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

  const handleClose = () => {
    playClickSound();
    onClose();
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setIsUpdating(true);

    try {
      let avatarUrl = adminData.avatar_url;

      // 1. Upload Avatar if changed
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${adminData.id}_${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = publicUrl;
      }

      // 2. Update Profile Data
      const updates: Partial<AdminData> = {
        name,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        ...(password ? { password } : {})
      };

      const { data: updatedData, error: dbError } = await supabase
        .from('admin_profile')
        .update(updates)
        .eq('id', adminData.id)
        .select()
        .single();

      if (dbError) throw dbError;

      // Call onUpdate to update local state and session storage
      onUpdate(updatedData);
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={handleClose} 
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl animate-fade-in">
        <button 
          onClick={handleClose}
          onMouseEnter={playHoverSound}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-light tracking-widest uppercase mb-6 text-white">Edit Profile</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <div 
              onClick={() => {
                playClickSound();
                fileInputRef.current?.click();
              }}
              onMouseEnter={playHoverSound}
              className="relative w-24 h-24 rounded-full border-2 border-dashed border-white/20 bg-black/50 flex items-center justify-center cursor-pointer overflow-hidden group hover:border-white/50 transition-colors"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-white/20" />
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept="image/*"
              onChange={handleAvatarSelect}
            />
            <p className="text-xs uppercase tracking-widest text-white/40">Profile Image</p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/60">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-white/30 transition-colors"
              placeholder="Admin Name"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/60">New Password <span className="text-white/30 lowercase">(leave blank to keep current)</span></label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-white/30 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isUpdating || !name}
            onMouseEnter={playHoverSound}
            className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 rounded-lg font-medium uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-white/90"
          >
            {isUpdating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
