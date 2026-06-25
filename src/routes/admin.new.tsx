import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, FileText } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ALL_GRADES, gradeLabel, type Grade } from "@/lib/grades";
import { generateQuiz, convertEssayToMCQ } from "@/lib/ai-quiz.functions";
import type { Question } from "@/lib/quiz/types";

export const Route = createFileRoute("/admin/new")({
  component: NewQuiz,
});

type Source = "ai" | "essay" | "manual";

function NewQuiz() {
  const nav = useNavigate();
  const { isSuperAdmin, adminGrades } = useProfile();
  const allowedGrades = isSuperAdmin ? ALL_GRADES.map(g => g.value) : adminGrades;

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [grade, setGrade] = useState<Grade | "">(allowedGrades[0] as Grade ?? "");
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<Source>("ai");

  const runAi = useServerFn(generateQuiz);
  const runEssay = useServerFn(convertEssayToMCQ);

  async function save() {
    if (!title || !grade || questions.length === 0) {
      toast.error("أكمل البيانات وأضف أسئلة أولاً");
      return;
    }
    setSaving(true);
    try {
      const user = auth.currentUser;
      const docRef = await addDoc(collection(db, "quizzes"), {
        title,
        description: desc,
        grade,
        source,
        questions,
        is_published: true, // ننشر الاختبار مباشرة
        created_by: user?.uid,
        created_at: new Date().toISOString()
      });
      toast.success("تم حفظ الاختبار ونشره للطلاب!");
      nav({ to: "/admin" });
    } catch (err: any) {
      toast.error("حدث خطأ أثناء الحفظ", { description: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="quiz-card p-5">
        <h2 className="text-lg font-bold mb-4">تفاصيل الاختبار الأساسية</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>عنوان الاختبار</Label>
            <Input placeholder="مثال: اختبار الجبر - الوحدة الأولى" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>الصف الدراسي</Label>
            <Select value={grade} onValueChange={v => setGrade(v as Grade)}>
              <SelectTrigger><SelectValue placeholder="اختر الصف" /></SelectTrigger>
              <SelectContent>
                {allowedGrades.map(g => {
                  const lbl = gradeLabel(g);
                  return lbl !== "—" ? <SelectItem key={g} value={g}>{lbl}</SelectItem> : null;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>وصف قصير (اختياري)</Label>
            <Input placeholder="ملاحظات سريعة تظهر للطلاب" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="quiz-card p-5">
        <Tabs value={source} onValueChange={(v) => setSource(v as Source)}>
          <TabsList className="mb-4">
            <TabsTrigger value="ai"><Sparkles className="h-4 w-4 ml-1" /> توليد ذكي</TabsTrigger>
            <TabsTrigger value="essay"><FileText className="h-4 w-4 ml-1" /> من نص مقالي</TabsTrigger>
            <TabsTrigger value="manual">إدخال يدوي</TabsTrigger>
          </TabsList>

          <TabsContent value="ai">
            <AiGenerator grade={grade as Grade} onGenerated={setQuestions} run={runAi} />
          </TabsContent>

          <TabsContent value="essay">
            <EssayGenerator grade={grade as Grade} onGenerated={setQuestions} run={runEssay} />
          </TabsContent>
          
          <TabsContent value="manual">
            <ManualEditor questions={questions} onChange={setQuestions} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <Button size="lg" onClick={save} disabled={saving || questions.length === 0}>
          {saving ? "جارٍ الحفظ..." : `حفظ ونشر الاختبار (${questions.length} أسئلة)`}
        </Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// مكونات فرعية (Sub-components) لتبويبات الذكاء الاصطناعي والإدخال
// -------------------------------------------------------------

function AiGenerator({ grade, onGenerated, run }: { grade: Grade; onGenerated: (q: Question[]) => void; run: any }) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!topic || !grade) { toast.error("أدخل الموضوع والصف أولاً"); return; }
    setLoading(true);
    try {
      const res = await run({ data: { topic, count, gradeLabel: gradeLabel(grade) } });
      onGenerated(res.questions);
      toast.success(`تم توليد ${res.questions.length} أسئلة بنجاح!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Textarea placeholder="اكتب موضوع الاختبار هنا (مثال: خصائص المثلث المتساوي الساقين...)" value={topic} onChange={e => setTopic(e.target.value)} rows={3} />
      <div className="flex items-end gap-3">
        <div className="space-y-1.5 w-32">
          <Label>عدد الأسئلة</Label>
          <Input type="number" min={1} max={50} value={count} onChange={e => setCount(Number(e.target.value))} />
        </div>
        <Button onClick={generate} disabled={loading} className="flex-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Sparkles className="h-4 w-4 ml-2" />}
          توليد الأسئلة فوراً
        </Button>
      </div>
    </div>
  );
}

function EssayGenerator({ grade, onGenerated, run }: { grade: Grade; onGenerated: (q: Question[]) => void; run: any }) {
  const [essayText, setEssayText] = useState("");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (essayText.length < 20 || !grade) { toast.error("أدخل نصاً كافياً والصف أولاً"); return; }
    setLoading(true);
    try {
      const res = await run({ data: { essayText, count, gradeLabel: gradeLabel(grade) } });
      onGenerated(res.questions);
      toast.success(`تم تحويل النص إلى ${res.questions.length} أسئلة بنجاح!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Textarea placeholder="انسخ والصق النص المقالي الطويل أو الفصل من المنهج هنا..." value={essayText} onChange={e => setEssayText(e.target.value)} rows={6} />
      <div className="flex items-end gap-3">
        <div className="space-y-1.5 w-32">
          <Label>عدد الأسئلة</Label>
          <Input type="number" min={1} max={50} value={count} onChange={e => setCount(Number(e.target.value))} />
        </div>
        <Button onClick={generate} disabled={loading} className="flex-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <FileText className="h-4 w-4 ml-2" />}
          استخراج الأسئلة من النص
        </Button>
      </div>
    </div>
  );
}

function ManualEditor({ questions, onChange }: { questions: Question[]; onChange: (q: Question[]) => void }) {
  function add() { onChange([...questions, { id: questions.length + 1, question: "", options: ["", "", "", ""], answer: "" }]); }
  function upd(i: number, q: Question) { const n = [...questions]; n[i] = q; onChange(n); }
  function rem(i: number) { onChange(questions.filter((_, j) => j !== i)); }
  
  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={i} className="border border-border rounded-lg p-4 space-y-3 relative bg-card/50">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-sm">السؤال {i + 1}</span>
            <Button size="sm" variant="destructive" onClick={() => rem(i)}>حذف</Button>
          </div>
          <Input placeholder="نص السؤال..." value={q.question} onChange={e => upd(i, { ...q, question: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((o, j) => (
              <Input key={j} placeholder={`الخيار ${j+1}`} value={o} onChange={e => { const opts = [...q.options]; opts[j] = e.target.value; upd(i, { ...q, options: opts }); }} />
            ))}
          </div>
          <Select value={q.answer} onValueChange={v => upd(i, { ...q, answer: v })}>
            <SelectTrigger><SelectValue placeholder="حدد الإجابة الصحيحة" /></SelectTrigger>
            <SelectContent>
              {q.options.filter(Boolean).map((o, j) => <SelectItem key={j} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ))}
      <Button variant="outline" onClick={add} className="w-full">+ إضافة سؤال يدوي</Button>
    </div>
  );
}
