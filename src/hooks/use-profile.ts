import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  stage: string | null;
  grade: string | null;
  role: "super_admin" | "admin" | "student";
  is_active: boolean;
  admin_grades?: string[];
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "profiles", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile({ id: user.uid, ...data } as Profile);
          } else {
            // إذا كان الحساب جديداً تماماً، ننشئ له ملف طالب افتراضي
            const defaultProfile = {
              full_name: user.displayName || user.email?.split("@")[0] || "طالب جديد",
              email: user.email,
              stage: null,
              grade: null,
              role: "student", // يمكنك تغيير حسابك أنت يدوياً إلى super_admin من لوحة Firebase
              is_active: true,
              admin_grades: []
            };
            await setDoc(docRef, defaultProfile);
            setProfile({ id: user.uid, ...defaultProfile } as Profile);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const isSuperAdmin = profile?.role === "super_admin";
  const adminGrades = profile?.admin_grades || [];

  return {
    profile,
    isAdmin,
    isSuperAdmin,
    adminGrades,
    loading,
  };
}
