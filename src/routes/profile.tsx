import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAGES, GRADES_BY_STAGE, type Stage, type Grade } from "@/lib/grades";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "ملفي — منصة التعليم الذكية" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [stage, setStage] = useState<Stage | "">("");
  const [grade, setGrade] = useState<Grade | "">("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        nav({ to: "/auth", search: { redirect: "/profile" } });
        return;
      }

      try {
        const docRef = doc(db, "profiles", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFullName(data.full_name ?? "");
          setStage((data.stage as Stage) ?? "");
          setGrade((data.grade as Grade) ?? "");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [nav]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!stage || !grade) {
      toast.error("الرجاء اختيار المرحلة والصف الدراسي");
      return;
    }
    
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      const docRef = doc(db, "profiles", user.uid);
      await updateDoc(docRef, {
        full_name: fullName,
        stage,
        grade,
        updated_at: new Date().toISOString()
      });
      
      toast.success("تم حفظ وتحديث ملفك الشخصي بنجاح");
      nav({ to: "/dashboard" });
    } catch (error: any) {
      toast.error("تعذر حفظ البيانات", { description: error.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="container mx-auto p-10 text-center text-muted-foreground">جارٍ تحميل بيانات الملف...</div>;

  return (
    <div className="container mx-auto max-w-md px-4 py-10">
      <div className="quiz-card p-7">
        <h1 className="text-2xl font-bold">ملفي الشخصي</h1>
        <p className="mt-1 text-sm text-muted-foreground">اختر صفك الدراسي لعرض الاختبارات والواجبات المخصصة لك.</p>
        <form onSubmit={save} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">الاسم بالكامل</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>المرحلة الدراسية</Label>
            <Select value={stage} onValueChange={(v) => { setStage(v as Stage); setGrade(""); }}>
              <SelectTrigger><SelectValue placeholder="اختر المرحلة الدراسية" /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {stage && (
            <div className="space-y-1.5">
              <Label>الصف الدراسي</Label>
              <Select value={grade} onValueChange={(v) => setGrade(v as Grade)}>
                <SelectTrigger><SelectValue placeholder="اختر الصف الحالي" /></SelectTrigger>
                <SelectContent>
                  {GRADES_BY_STAGE[stage].map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "جارٍ الحفظ والتهيئة..." : "حفظ التغييرات ودخول المنصة"}
          </Button>
        </form>
      </div>
    </div>
  );
}
