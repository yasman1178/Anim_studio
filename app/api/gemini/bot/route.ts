import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// POST /api/gemini/bot
// AI Dubbing Director Bot for Egyptian Anime Dubbing
// Handles script generation, Egyptian slang adaptation, character voice advice, and timing sync.
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "لم يتم العثور على مفتاح GEMINI_API_KEY في بيئة العمل.",
          details:
            "يرجى إضافة GEMINI_API_KEY في إعدادات البيئة (Settings > Secrets أو ملف .env).",
          code: "MISSING_API_KEY",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { prompt, context, character, mode } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "حقل نص الطلب (prompt) مطلوب للمحادثة مع البوت." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const systemInstruction = `أنت "مساعد مخرج الدبلجة الذكي" لقناة «محب أنمي»، خبير متمرس في دبلجة الأنمي والكرتون إلى اللهجة المصرية المعاصرة والذكية.
مهمتك:
1. تحويل الحوارات اليابانية أو المترجمة بالفصحى إلى لهجة مصرية طبيعية، حيوية، وممتعة بدون تكلف.
2. ضبط طول الجمل ليتوافق بدقة مع مدة المشهد (Lip-sync timing).
3. اقتراح نبرة الصوت المناسبة لكل شخصية:
   - الشخصيات الذكورية الشابة (مثل سيف): نبرة بطولية سريعة.
   - الشخصيات النسائية (مثل سارة): نبرة أنثوية طبيعية.
   - الوحوش والخصوم الأقوياء: نبرة ضخمة مع انخفاض حدة التردد (Pitch -15Hz).
   - النظام أو الذكاء الاصطناعي: نبرة إلكترونية رتيبة وسريعة.
4. استخدم خفة الدم المصرية والإفيهات الممتعة المناسبة لأجواء الأكشن والأنمي بدون ابتذال.`;

    const userPrompt = `
الوضع: ${mode || "general"}
الشخصية المستهدفة: ${character || "غير محدد"}
السياق الحالي للمشروع: ${context ? JSON.stringify(context).slice(0, 500) : "مشروع دبلجة أنمي"}

طلب المستخدم:
${prompt}
    `.trim();

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text || "عفواً، لم أتمكن من توليد استجابة مناسبة.";

    return NextResponse.json({
      success: true,
      reply: replyText,
      model: "gemini-3.8-flash",
    });
  } catch (error: any) {
    console.error("Gemini Bot API error:", error);
    return NextResponse.json(
      {
        error: "فشل طلب روبوت الذكاء الاصطناعي",
        details: error?.message || String(error),
        tip: "تأكد من صلاحية مفتاح GEMINI_API_KEY ومن عدم تجاوز حد الاستهلاك المسموح.",
      },
      { status: 500 }
    );
  }
}
