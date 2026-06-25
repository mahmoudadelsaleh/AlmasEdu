import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { gradeLabel } from "@/lib/grades";

interface QRow { id: string; title: string; grade: string; is_published: boolean; source: string; questions: unknown[] }

export const Route = createFileRoute("/admin/")({
  component: QuizzesList,
});

function QuizzesList() {
  const [rows, setRows] = useState<QRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const q = query(collection(db, "quizzes"), orderBy("created_at", "desc"));
      const querySnapshot = await getDocs(q);
      const data: QRow[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as QRow);
      });
      setRows(data);
    } catch (error: any) {
      toast.error("خطأ في جلب الاختبارات", { description: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function togglePub(r: QRow) {
    try {
      await updateDoc(doc(db, "quizzes", r.id), { is_published: !r.is_published });
      toast.success(r.is_published ? "تم إلغاء النشر" : "تم النشر");
      load();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function del(r: QRow) {
    if (!confirm(`هل أنت متأكد من حذف اختبار "${r.title}"؟`)) return;
    try {
      await deleteDoc(doc(db, "quizzes", r.id));
      toast.success("تم الحذف بنجاح");
      load();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  if (loading) return <p className="text-muted-foreground p-10 text-center">جارٍ التحميل...</p>;
  
  if (rows.length === 0) return (
    <div className="quiz-card p-10 text-center">
      <p className="text-muted-foreground">لا توجد اختبارات بعد.</p>
      <Button asChild className="mt-4"><Link to="/admin/new">إنشاء أول اختبار</Link></Button>
    </div>
  );

  return (
    <ul className="space-y-3">
      {rows.map(r => (
        <li key={r.id} className="quiz-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{r.title}</h3>
            <p className="text-xs text-muted-foreground">{gradeLabel(r.grade)} • {r.questions?.length || 0} أسئلة • {r.source === 'ai' ? 'ذكاء اصطناعي' : 'يدوي / مقال'}</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <span className={r.is_published ? "text-success font-medium" : "text-muted-foreground"}>
                {r.is_published ? "منشور" : "مسودة"}
              </span>
              <Switch checked={r.is_published} onCheckedChange={() => togglePub(r)} />
            </label>
            <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => del(r)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
