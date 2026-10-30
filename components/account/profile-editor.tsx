"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { Camera, UserRound } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function ProfileEditor({ userId }: { userId: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const db = getSupabase();
        const { data, error } = await db.from("account_profiles").select("first_name,last_name,grade,avatar_path").eq("id", userId).maybeSingle();
        if (error) throw error;
        if (!active) return;
        if (data) { setFirstName(data.first_name); setLastName(data.last_name); setGrade(data.grade ?? ""); setAvatarPath(data.avatar_path); }
        if (data?.avatar_path) {
          const { data: image } = await db.storage.from("avatars").createSignedUrl(data.avatar_path, 3600);
          if (active && image) setAvatar(image.signedUrl);
        }
        if (active) setReady(true);
      } catch { if (active) setMessage("Profil yüklənmədi. Səhifəni yeniləyin."); }
    })();
    return () => { active = false; };
  }, [userId]);
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setMessage("");
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5000000) throw new Error("5 MB-dan kiçik JPG, PNG və ya WebP şəkli seçin.");
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
      const side = Math.min(bitmap.width, bitmap.height);
      canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256); bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Şəkil oxunmadı.")), "image/webp", 0.85));
      const path = `${userId}/avatar.webp`;
      const db = getSupabase();
      const { error } = await db.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/webp", cacheControl: "0" });
      if (error) throw new Error("Şəkil yüklənmədi. Yenidən cəhd edin.");
      const { error: profileError } = await db.from("account_profiles").upsert({ id: userId, first_name: firstName.trim(), last_name: lastName.trim(), grade: grade || null, avatar_path: path }, { onConflict: "id" });
      if (profileError) throw new Error("Şəkil profilə bağlanmadı.");
      setAvatarPath(path); const { data } = await db.storage.from("avatars").createSignedUrl(path, 3600);
      if (data) setAvatar(data.signedUrl);
      setMessage("Profil şəkli saxlanıldı.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Şəkil yüklənmədi."); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const { error } = await getSupabase().from("account_profiles").upsert({ id: userId, first_name: firstName.trim(), last_name: lastName.trim(), grade: grade || null, avatar_path: avatarPath }, { onConflict: "id" });
      if (error) throw error;
      setMessage("Profil saxlanıldı.");
    } catch { setMessage("Profil saxlanmadı. Yenidən cəhd edin."); }
    finally { setBusy(false); }
  }
  return <section className="kairo-card mb-6 rounded-3xl p-6 md:p-8"><div className="flex items-center gap-5"><div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/5">{avatar ? <Image unoptimized src={avatar} alt="Profil şəkli" fill sizes="80px" className="object-cover" /> : <UserRound className="size-8 text-red-400" />}</div><div><h2 className="text-xl font-semibold">Şəxsi profil</h2><label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-red-400"><Camera className="size-4" />Şəkil seç<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy || !ready} onChange={e => void upload(e.target.files?.[0])} /></label><p className="kairo-muted mt-1 text-xs">Şəkil yalnız özünə və administratora görünür.</p></div></div><form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-3"><label className="text-sm">Ad<input className="account-field" value={firstName} maxLength={60} autoComplete="given-name" onChange={e => setFirstName(e.target.value)} /></label><label className="text-sm">Soyad<input className="account-field" value={lastName} maxLength={60} autoComplete="family-name" onChange={e => setLastName(e.target.value)} /></label><label className="text-sm">Sinif<select className="account-field" value={grade} onChange={e => setGrade(e.target.value)}><option value="">Seçilməyib</option>{Array.from({ length: 11 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}-ci sinif</option>)}</select></label><div className="sm:col-span-3"><Button disabled={busy || !ready} type="submit">{busy ? "Saxlanılır…" : "Profili saxla"}</Button></div></form>{message && <p role="status" className="mt-4 text-sm text-red-400">{message}</p>}</section>;
}
