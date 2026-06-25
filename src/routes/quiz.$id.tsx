import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { pickQuestions } from "@/lib/quiz/quizzes";
import type { Question } from "@/lib/quiz/types";

export const Route = createFileRoute("/quiz/$id")({
  head: () => ({ meta: [{ title: "اختبار — منصة الرياضيات" }] }),
  component: QuizPage,
});

interface QuizDb { id: string; title: string; grade: string; questions: Question[] }

function QuizPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [quiz, setQuiz] = useState<QuizDb | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState<"loading"|"playing"|"review">("loading");

  useEffect(() => {
    (async () => {
      try {
        const docRef = doc(db, "quizzes", id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          setError("الاختبار غير موجود أو تم حذفه.");
          return;
        }

        const data = docSnap.data();
        const q = { id: docSnap.id, ...data } as QuizDb;
        const picked = pickQuestions(q.questions || [], "all");
        
        setQuiz(q); 
        setQuestions(picked); 
        setAnswers(Array(picked.length).fill(null));
        setStage("playing");
      } catch (err: any) {
        setError(err.message);
      }
    })();
  }, [id]);

  const score = useMemo(() => questions.reduce((a, q, i) => a + (answers[i] === q.answer ? 1 : 0), 0), [questions, answers]);

  async function submit() {
    setStage("review");
    const user = auth.currentUser;
    if (user && quiz) {
      try {
        await addDoc(collection(db, "quiz_results"), {
          user_id: user.uid,
          quiz_id: quiz.id,
          quiz_name: quiz.title,
          score,
          total_questions: questions.length,
          grade: quiz.grade,
          created_at: new Date().toISOString()
        });
        toast.success("تم حفظ نتيجتك بنجاح");
      } catch (err: any) {
        toast.error("تعذر حفظ النتيجة", { description: err.message });
      }
    }
  }

  if (error) return <Empty title="تعذر تحميل الاختبار" body={error} />;
  if (stage === "loading" || !quiz) return <div className="container mx-auto max-w-2xl p-10"><Skeleton className="h-40" /></div>;

  if (stage === "review") {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="quiz-card p-7 text-center">
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          <div className={cn("mt-4 text-5xl font-extrabold", pct >= 60 ? "text-success" : "text-destructive")}>{pct}%</div>
          <p className="mt-2 text-muted-foreground">{score} / {questions.length}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => { setAnswers(Array(questions.length).fill(null)); setIdx(0); setStage("playing"); }}>
              <RotateCcw className="h-4 w-4" /> إرسال إجابة جديدة
            </Button>
            <Button asChild variant="outline"><Link to="/dashboard">العودة للوحة</Link></Button>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {questions.map((q, i) => {
            const correct = answers[i] === q.answer;
            return (
              <div key={q.id ?? i} className="quiz-card p-4">
                <div className="flex items-start gap-2">
                  {correct ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
                  <div className="flex-1">
                    <p className="font-medium">{q.question}</p>
                    <p className="mt-1 text-sm text-muted-foreground">إجابتك: {answers[i] ?? "—"}</p>
                    {!correct && <p className="text-sm text-success">الإجابة الصحيحة: {q.answer}</p>}
                    {q.explanation && <p className="mt-2 text-xs bg-muted p-2 rounded text-muted-foreground">💡 {q.explanation}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const sel = answers[idx];
  const last = idx === questions.length - 1;
  const all = answers.every(a => a !== null);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <div className="mb-5">
        <div className="mb-2 flex justify-between text-sm text-muted-foreground">
          <span>سؤال {idx + 1} من {questions.length}</span>
          <span>{Math.round(((idx + 1)/questions.length)*100)}%</span>
        </div>
        <Progress value={((idx+1)/questions.length)*100} className="h-2" />
      </div>
      <div key={idx} className="quiz-card p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <h2 className="text-lg font-semibold md:text-xl">{q.question}</h2>
        <div className="mt-5 grid gap-3">
          {q.options.map(opt => (
            <button key={opt} type="button"
              onClick={() => setAnswers(p => { const n = [...p]; n[idx] = opt; return n; })}
              className={cn("choice-base choice-base-hover", sel === opt && "choice-selected")}>
              {opt}
            </button>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => setIdx(i => Math.max(0, i-1))} disabled={idx === 0}>
            <ArrowRight className="h-4 w-4" /> السابق
          </Button>
          {last ? (
            <Button onClick={submit} disabled={!all}>تسليم النتيجة</Button>
          ) : (
            <Button onClick={() => setIdx(i => Math.min(questions.length-1, i+1))} disabled={!sel}>
              التالي <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="container mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
      <Button asChild className="mt-5"><Link to="/dashboard">الرجوع</Link></Button>
    </div>
  );
}
