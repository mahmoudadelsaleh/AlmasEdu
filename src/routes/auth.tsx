import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — الماس إديو" },
      { name: "description", content: "سجل الدخول أو أنشئ حساباً لحفظ نتائج اختباراتك." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate({ to: (search.redirect as any) ?? "/" });
      }
    });
    return () => unsubscribe();
  }, [navigate, search.redirect]);

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div className="quiz-card w-full max-w-md p-7">
        <h1 className="text-2xl font-bold text-foreground">مرحباً بك 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          سجل الدخول أو أنشئ حساباً جديداً لحفظ نتائجك ومتابعة دروسك.
        </p>

        <Tabs defaultValue="signin" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">دخول</TabsTrigger>
            <TabsTrigger value="signup">حساب جديد</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="mt-5">
            <SignInForm onDone={() => navigate({ to: (search.redirect as any) ?? "/" })} />
          </TabsContent>
          <TabsContent value="signup" className="mt-5">
            <SignUpForm onDone={() => navigate({ to: "/" })} />
          </TabsContent>
        </Tabs>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          أو
          <div className="h-px flex-1 bg-border" />
        </div>

        <GoogleButton />
      </div>
    </div>
  );
}

function SignInForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("تم تسجيل الدخول بنجاح");
      onDone();
    } catch (error: any) {
      toast.error("فشل تسجيل الدخول", { description: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field id="signin-email" label="البريد الإلكتروني" icon={<Mail className="h-4 w-4" />}>
        <Input
          id="signin-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field id="signin-pass" label="كلمة المرور" icon={<Lock className="h-4 w-4" />}>
        <Input
          id="signin-pass"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
      </Button>
    </form>
  );
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success("تم إنشاء الحساب بنجاح، يمكنك الآن ضبط ملفك الشخصي.");
      onDone();
    } catch (error: any) {
      toast.error("فشل إنشاء الحساب", { description: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field id="signup-email" label="البريد الإلكتروني" icon={<Mail className="h-4 w-4" />}>
        <Input
          id="signup-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field id="signup-pass" label="كلمة المرور (6 أحرف على الأقل)" icon={<Lock className="h-4 w-4" />}>
        <Input
          id="signup-pass"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "جارٍ الإنشاء..." : "إنشاء حساب"}
      </Button>
    </form>
  );
}

function GoogleButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success("تم تسجيل الدخول عبر جوجل بنجاح");
    } catch (error: any) {
      toast.error("تعذر تسجيل الدخول عبر جوجل", { description: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" className="w-full" onClick={handleClick} disabled={loading}>
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.4l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 9.6-4.8 9.6-7.4 0-.5 0-.9-.1-1.3H12z" />
      </svg>
      {loading ? "جارٍ الاتصال..." : "المتابعة باستخدام جوجل"}
    </Button>
  );
}

function Field({ id, label, icon, children }: { id: string; label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </Label>
      {children}
    </div>
  );
}
