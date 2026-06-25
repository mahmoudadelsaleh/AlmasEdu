import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, Trophy, Users } from "lucide-react";
import { collection, getDocs, getCountFromServer } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { ALL_GRADES, gradeLabel } from "@/lib/grades";

export const Route = createFileRoute("/admin/stats")({
  component: Stats,
});

function Stats() {
  const [s, setS] = useState({ users: 0, quizzes: 0, attempts: 0, avg: 0 });
  const [byGrade, setByGrade] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [usersSnap, quizzesSnap, resultsQuery, profsQuery] = await Promise.all([
          getCountFromServer(collection(db, "profiles")),
          getCountFromServer(collection(db, "quizzes")),
          getDocs(collection(db, "quiz_results")),
          getDocs(collection(db, "profiles")),
        ]);

        const attempts = resultsQuery.size;
        let totalScorePct = 0;
        resultsQuery.forEach(doc => {
          const r = doc.data();
          if (r.total_questions > 0) {
            totalScorePct += (r.score / r.total_questions);
          }
        });
        
        const avg = attempts > 0 ? Math.round((totalScorePct / attempts) * 100) : 0;
        setS({ users: usersSnap.data().count, quizzes: quizzesSnap.data().count, attempts, avg });

        const map: Record<string, number> = {};
        profsQuery.forEach(doc => {
          const p = doc.data();
          if (p.grade) {
            map[p.grade] = (map[p.grade] || 0) + 1;
          }
        });
        setByGrade(map);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-center p-10 text-muted-foreground">جارٍ حساب الإحصائيات...</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={<Users className="h-5 w-5" />} label="المستخدمون" value={s.users} />
        <Card icon={<BookOpen className="h-5 w-5" />} label="الاختبارات" value={s.quizzes} />
        <Card icon={<GraduationCap className="h-5 w-5" />} label="المحاولات" value={s.attempts} />
        <Card icon={<Trophy className="h-5 w-5" />} label="متوسط الدرجات" value={`${s.avg}%`} />
      </div>
      <div className="quiz-card p-5">
        <h3 className="font-semibold mb-3">توزيع الطلاب حسب الصف</h3>
        <div className="space-y-2">
          {ALL_GRADES.map(g => {
            const n = byGrade[g.value] ?? 0;
            const max = Math.max(1, ...Object.values(byGrade), 1);
            return (
              <div key={g.value} className="flex items-center gap-2 text-sm">
                <span className="w-44 truncate">{gradeLabel(g.value)}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(n/max)*100}%` }} />
                </div>
                <span className="w-8 text-muted-foreground">{n}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Card({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="quiz-card flex items-center gap-4 p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
