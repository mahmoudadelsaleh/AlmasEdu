import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

const QuestionSchema = z.object({
  id: z.number(),
  question: z.string(),
  options: z.array(z.string()).length(4),
  answer: z.string(),
  explanation: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  topic: z.string().optional(),
});

const FileSchema = z.object({
  dataUrl: z.string().min(20),
  name: z.string().default("file"),
});

const InputSchema = z.object({
  topic: z.string().min(1),
  count: z.number().min(1).max(50).default(10),
  gradeLabel: z.string(),
  images: z.array(z.string()).max(10).optional(),
  pdf: FileSchema.optional(),
});

const EssayInputSchema = z.object({
  essayText: z.string().min(10),
  count: z.number().min(1).max(50).default(10),
  gradeLabel: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  includeDifficulty: z.boolean().optional(),
});

// دالة توليد اختبار من موضوع عام أو صور أو PDF
export const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("مفتاح VITE_GEMINI_API_KEY غير موجود في الإعدادات");

    const ai = new GoogleGenAI({ apiKey });
    const sys = `أنت معلم رياضيات خبير. أنشئ اختباراً متعدد الخيارات لـ "${data.gradeLabel}".
الموضوع/الإرشادات: ${data.topic}
أعِد فقط JSON صالحاً: كائن { "questions": [...] } يحتوي على ${data.count} أسئلة.
كل سؤال: { "id": رقم تسلسلي، "question": نص بالعربية، "options": مصفوفة من 4 خيارات نصية، "answer": يطابق أحد الخيارات حرفياً، "explanation": "شرح مبسط" }.`;

    const parts: any[] = [{ text: sys }];

    if (data.pdf) {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: data.pdf.dataUrl.split(",")[1] || data.pdf.dataUrl
        }
      });
    }

    if (data.images?.length) {
      for (const img of data.images) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: img.split(",")[1] || img
          }
        });
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [{ role: "user", parts }],
      config: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(response.text || "{}");
    const arr = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
    return { questions: z.array(QuestionSchema).parse(arr) };
  });

// دالة تحويل النصوص المقالية الطويلة إلى أسئلة
export const convertEssayToMCQ = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => EssayInputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("مفتاح VITE_GEMINI_API_KEY غير موجود");

    const ai = new GoogleGenAI({ apiKey });
    const sys = `أنت معلم خبير متخصص في إنشاء الاختبارات. حول النص المقالي المعطى إلى ${data.count} أسئلة اختيار من متعدد للصف "${data.gradeLabel}".
يجب أن يحتوي كل سؤال على 4 خيارات، إجابة صحيحة، وشرح مبسط.
النص المقالي:
${data.essayText}

أعد الناتج بصيغة JSON فقط: { "questions": [...] }`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: sys,
      config: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(response.text || "{}");
    const arr = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
    const validated = z.array(QuestionSchema).parse(arr);
    
    return { 
      questions: validated,
      converted: validated.length,
      timestamp: new Date().toISOString(),
    };
  });
