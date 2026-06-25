import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { useProfile } from "@/hooks/use-profile";
import { useSiteContent } from "@/hooks/use-site-content";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const nav = useNavigate();
  const { profile, isAdmin } = useProfile();
  const { content } = useSiteContent();

  async function handleLogout() {
    await signOut(auth);
    nav({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <span className="text-2xl">💎</span>
          {content?.brand?.name || "الماس إديو"}
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {profile ? (
            <>
              {isAdmin ? (
                <Button asChild variant="ghost" size="sm"><Link to="/admin">لوحة الإدارة</Link></Button>
              ) : (
                <Button asChild variant="ghost" size="sm"><Link to="/dashboard">اختباراتي</Link></Button>
              )}
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/profile">ملفي</Link></Button>
              <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">خروج</span>
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="font-bold"><Link to="/auth">تسجيل الدخول</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}
