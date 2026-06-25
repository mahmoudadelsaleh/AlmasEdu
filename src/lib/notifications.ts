import { collection, addDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { toast } from "sonner";

// دالة إرسال البريد الإلكتروني التلقائي (تعمل في الخلفية عبر Firebase Extension)
export async function sendEmailNotification(quizTitle: string, gradeLabel: string, quizId: string) {
  try {
    await addDoc(collection(db, "mail"), {
      to: "all_students@almasedu.com", // يمكنك تعديلها لاحقاً لإرسالها لقائمة بريدية حقيقية
      message: {
        subject: `🚨 اختبار جديد متاح: ${quizTitle}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9;">
            <h2 style="color: #0d5a6a;">تنبيه من منصة الماس إديو 💎</h2>
            <p>مرحباً يا بطل، تم نشر اختبار رياضيات جديد بعنوان <b>${quizTitle}</b> مخصص لـ <b>${gradeLabel}</b>.</p>
            <br/>
            <a href="${window.location.origin}/quiz/${quizId}" style="background: #0d5a6a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">اضغط هنا لبدء الاختبار الآن</a>
          </div>
        `
      }
    });
    console.log("تم تسجيل طلب إرسال البريد.");
  } catch (err) {
    console.error("خطأ في البريد:", err);
  }
}

// دالة فتح الواتساب من الموبايل مباشرة برسالة جاهزة
export function shareQuizViaWhatsApp(quizTitle: string, gradeLabel: string, quizId: string) {
  const fullLink = `${window.location.origin}/quiz/${quizId}`;
  
  const text = `*🚨 إشعار من منصة الماس إديو للرياضيات* 🚨\n\n` +
               `📚 *الاختبار:* ${quizTitle}\n` +
               `👥 *الصف المستهدف:* ${gradeLabel}\n\n` +
               `🔗 *رابط الدخول الفوري:*\n${fullLink}\n\n` +
               `💪 تمنياتنا بالتوفيق للجميع! ✨`;

  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
  toast.success("تم فتح الواتساب لمشاركة الرابط!");
}
