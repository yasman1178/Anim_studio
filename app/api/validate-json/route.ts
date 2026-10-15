import { NextRequest, NextResponse } from "next/server";
import { validateNotebookLMJson } from "@/lib/validate-json";

export async function POST(req: NextRequest) {
  try {
    const jsonBody = await req.json();
    const result = validateNotebookLMJson(jsonBody);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      is_valid: false,
      total_shots: 0,
      calculated_total_duration: 0,
      errors_count: 1,
      warnings_count: 0,
      issues: [{
        type: 'error',
        code: 'PARSE_EXCEPTION',
        message_ar: 'حدث خطأ أثناء فحص ملف JSON: ' + String(error)
      }],
      missing_assets: { images: [], vfx: [], sfx: [], music: [] }
    }, { status: 400 });
  }
}
