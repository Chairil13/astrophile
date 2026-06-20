import { supabase } from "./supabase";

export interface AdminProfile {
  name: string;
  avatar_url?: string;
}

export async function fetchAdminProfile(): Promise<AdminProfile | null> {
  const { data, error } = await supabase
    .from("admin_profile")
    .select("name, avatar_url")
    .eq("username", "admin")
    .single();

  if (error || !data) {
    console.error("Error fetching admin profile:", error);
    return null;
  }

  return data;
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
