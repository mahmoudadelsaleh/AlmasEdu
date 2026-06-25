import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

export function useSiteContent() {
  const [content, setContent] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const docRef = doc(db, "site_content", "config");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setContent(docSnap.data());
        } else {
          // إذا كانت هذه أول مرة يفتح فيها الموقع، ننشئ الإعدادات الافتراضية
          const defaultConfig = {
            brand: { name: "الماس إديو", tagline: "منصة الرياضيات الذكية" },
            home_hero: { 
              title_line_1: "اختبارات رياضيات ذكية", 
              subtitle: "منصة تعليمية متطورة لكل المراحل الدراسية",
              cta: "ابدأ الآن"
            }
          };
          await setDoc(docRef, defaultConfig);
          setContent(defaultConfig);
        }
      } catch (error) {
        console.error("Error loading site config:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadConfig();
  }, []);

  return { content, loading };
}
