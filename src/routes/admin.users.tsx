import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/integrations/firebase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_GRADES, gradeLabel } from "@/lib/grades";

export const Route = createFileRoute("/admin/users")({
  component: UsersAdmin,
});

interface Row { id: string; full_name: string; email: string; grade: string; role: "super_admin" | "admin" | "student"; admin_grades: string[] }

function UsersAdmin() {
  const { isSuperAdmin, loading: profLoading } = useProfile();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const snap = await getDocs(collection(db, "profiles"));
      const data: Row[] = [];
      snap.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Row);
      });
      setRows(data);
    } catch (error) {
      toast.error("تعذر جلب المستخدمين");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function changeRole(userId: string, newRole: string) {
    try {
      await updateDoc(doc(db, "profiles", userId), { role: newRole });
      toast.success("تم تحديث الصلاحية بنجاح");
      load();
    } catch (err: any) {
      toast.error("فشل التحديث", { description: err.message });
    }
  }

  async function toggleGrade(userId: string, currentGrades: string[], gradeVal: string, hasIt: boolean) {
    const newGrades = hasIt ? currentGrades.filter(g => g !== gradeVal) : [...currentGrades, gradeVal];
    try {
      await updateDoc(doc(db, "profiles", userId), { admin_grades: newGrades });
      load();
    } catch (err) {
      toast.error("حدث خطأ");
    }
  }

  async function resetPassword(email: string) {
    if(!email) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(`تم إرسال رابط إعادة التعيين إلى ${email}`);
    } catch (err: any) {
      toast.error("تعذر إرسال الرابط", { description: err.message });
    }
  }

  if (profLoading || loading) return <p className="text-center p-10 text-muted-foreground">جارٍ التحميل...</p>;
  if (!isSuperAdmin) return <p className="p-10 text-center text-destructive">صلاحيات السوبر أدمن مطلوبة.</p>;

  return (
    <div className="space-y-4">
      {rows.map(u => {
        const isAdm = u.role === "admin";
        const ag = u.admin_grades || [];
        return (
          <div key={u.id} className="quiz-card p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-bold">{u.full_name || "بدون اسم"}</p>
                <p className="text-sm text-muted-foreground">{u.email} • {u.grade ? gradeLabel(u.grade) : "لم يحدد الصف"}</p>
              </div>
              <div className="w-40">
                <Select value={u.role || "student"} onValueChange={v => changeRole(u.id, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">طالب</SelectItem>
                    <SelectItem value="admin">مدير (معلم)</SelectItem>
                    <SelectItem value="super_admin">سوبر أدمن</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isAdm && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">الصفوف المسموح للمدير إدارتها:</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_GRADES.map(g => {
                    const has = ag.includes(g.value);
                    return (
                      <button key={g.value} type="button"
                        onClick={() => toggleGrade(u.id, ag, g.value, has)}
                        className={`text-xs rounded-md px-2 py-1 border ${has ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="border-t border-border pt-3">
              <Button size="sm" variant="outline" onClick={() => resetPassword(u.email)}>
                إرسال رابط إعادة تعيين كلمة المرور
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
