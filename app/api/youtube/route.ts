import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { anime_title, episode, project_name, total_shots, duration_seconds } = body;

    const channelName = "محب أنمي";
    const title = `ملخص ودبلجة ${anime_title || 'الأنمي'} - الحلقة ${episode || 1} بالمصري | إثارة خرافية!`;
    
    const description = `أهلاً بكم في قناة «${channelName}»! 🔥
نقدم لكم في هذا الفيديو الدبلجة المصرية الحصرية والملخص المثير لأنمي ${anime_title || 'المميز'} (الحلقة ${episode || 1}).

🎬 تفاصيل العمل:
- اسم المشروع: ${project_name || 'دبلجة أنمي'}
- عدد المشاهد: ${total_shots || 3} لقطات
- المدة الإجمالية: ${duration_seconds || 16} ثانية
- اللهجة: العربية المصرية (أداء صوتي ممتع ومتقن)
- قناة النشر: ${channelName}

⚠️ تنويه حقوق الملكية (Fair Use & Adaptation Notice):
هذا العمل هو تكييف فني ودبلجة تعليقية غير رسمية تم إعدادها لأغراض الترفيه ومشاركة حب الأنمي مع الجمهور العربي. جميع حقوق الرسوم والصور الأصلية محفوظة لأصحابها واستوديوهات الإنتاج المعنية.

لا تنسوا الاشتراك في قناة «${channelName}» وتفعيل زر الجرس لدعم المزيد من حلقات الدبلجة الأسبوعية! ❤️`;

    const tags = [
      "محب أنمي",
      anime_title || "أنمي",
      "دبلجة مصرية",
      "أنمي بالمصري",
      `ملخص ${anime_title || 'أنمي'}`,
      "سولو ليفلينج",
      "جوجوتسو كايسن",
      "دبلجة كرتون",
      "أوتاكو العرب",
      "انمي مترجم",
      "أنمي مدبلج",
      "Anime Arabic Dub"
    ];

    return NextResponse.json({
      success: true,
      publishing_metadata: {
        title,
        description,
        tags,
        default_channel: channelName,
        category_id: "1", // Film & Animation
        default_language: "ar",
        privacy_status: "unlisted", // Default unlisted as requested by safety spec
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate metadata", details: String(error) }, { status: 500 });
  }
}
