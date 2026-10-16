/**
 * Resilient JSON Parser & Sanitizer for Anime Dub Studio (v18)
 * Handles outputs from LLMs (NotebookLM, Gemini, Claude, ChatGPT) that include:
 * - Trailing commentary, markdown code fences (```json ... ```)
 * - Unexpected non-whitespace characters after JSON (e.g. line 299 column 2)
 * - Trailing commas before closing braces/brackets
 * - Single/double comment lines (// or slash-star)
 * - Multiple concatenated JSON blocks
 * - Invisible characters (BOM \uFEFF, zero-width spaces)
 */

export interface ResilientJsonResult {
  success: boolean;
  data?: any;
  cleanedText?: string;
  wasCleaned: boolean;
  cleanActions: string[];
  error?: string;
}

/**
 * Strips UTF-8 BOM, zero-width spaces, and control characters (except standard newlines/tabs)
 */
export function stripInvisibleCharacters(text: string): string {
  if (!text) return "";
  return text
    .replace(/^\uFEFF/, "") // UTF-8 BOM
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Zero-width spaces & joins
    .replace(/\0/g, ""); // Null bytes
}

/**
 * Strips markdown code blocks: ```json ... ``` or ``` ... ```
 */
export function stripMarkdownFences(text: string): { text: string; stripped: boolean } {
  let cleaned = text.trim();
  let stripped = false;

  // Match ```json or ``` at beginning
  if (/^```(?:json)?\s*\n/i.test(cleaned)) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n/i, "");
    stripped = true;
  } else if (/^```(?:json)?/i.test(cleaned)) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "");
    stripped = true;
  }

  // Match ``` at ending
  if (/\n```\s*$/i.test(cleaned)) {
    cleaned = cleaned.replace(/\n```\s*$/i, "");
    stripped = true;
  } else if (/```\s*$/i.test(cleaned)) {
    cleaned = cleaned.replace(/```\s*$/i, "");
    stripped = true;
  }

  return { text: cleaned.trim(), stripped };
}

/**
 * Scans text and extracts all balanced root JSON blocks ({ ... } or [ ... ])
 * Handles escaped quotes (\" and \\) and nested structures.
 * This completely isolates the JSON from any following comments, notes, or markdown.
 */
export function extractBalancedJsonBlocks(text: string): string[] {
  const blocks: string[] = [];
  const len = text.length;
  let i = 0;

  while (i < len) {
    // Find next opening '{' or '['
    const nextBrace = text.indexOf('{', i);
    const nextBracket = text.indexOf('[', i);

    let start = -1;
    let openChar = '{';
    let closeChar = '}';

    if (nextBrace !== -1 && (nextBracket === -1 || nextBrace < nextBracket)) {
      start = nextBrace;
      openChar = '{';
      closeChar = '}';
    } else if (nextBracket !== -1) {
      start = nextBracket;
      openChar = '[';
      closeChar = ']';
    } else {
      break; // No more JSON blocks
    }

    // Traverse from start to find balanced end
    let depth = 0;
    let inString = false;
    let end = -1;

    for (let j = start; j < len; j++) {
      const char = text[j];

      if (char === '"') {
        // Count preceding backslashes to check if quote is escaped
        let backslashCount = 0;
        let k = j - 1;
        while (k >= 0 && text[k] === '\\') {
          backslashCount++;
          k--;
        }
        if (backslashCount % 2 === 0) {
          inString = !inString;
        }
      } else if (!inString) {
        if (char === openChar) {
          depth++;
        } else if (char === closeChar) {
          depth--;
          if (depth === 0) {
            end = j;
            break;
          }
        }
      }
    }

    if (end !== -1) {
      blocks.push(text.slice(start, end + 1));
      i = end + 1;
    } else {
      // Unbalanced block, cannot proceed with balanced scan from here
      i = start + 1;
    }
  }

  return blocks;
}

/**
 * Removes comments and trailing commas inside JSON text outside of string literals
 */
export function cleanJsonSyntaxIssues(input: string): string {
  let output = "";
  let inString = false;
  const len = input.length;

  for (let i = 0; i < len; i++) {
    const char = input[i];

    if (char === '"') {
      let backslashCount = 0;
      let k = i - 1;
      while (k >= 0 && input[k] === '\\') {
        backslashCount++;
        k--;
      }
      if (backslashCount % 2 === 0) {
        inString = !inString;
      }
      output += char;
    } else if (!inString) {
      // Check for single line comments: // ...
      if (char === '/' && i + 1 < len && input[i + 1] === '/') {
        // Skip until newline
        const nextNewline = input.indexOf('\n', i + 2);
        if (nextNewline === -1) {
          break;
        } else {
          i = nextNewline;
          output += '\n';
          continue;
        }
      }
      // Check for multi-line comments: /* ... */
      if (char === '/' && i + 1 < len && input[i + 1] === '*') {
        const nextEnd = input.indexOf('*/', i + 2);
        if (nextEnd === -1) {
          break;
        } else {
          i = nextEnd + 1;
          continue;
        }
      }
      // Check for trailing commas before closing } or ]
      if (char === ',') {
        // Peek ahead to see if the next non-whitespace is '}' or ']'
        let j = i + 1;
        while (j < len && /\s/.test(input[j])) {
          j++;
        }
        if (j < len && (input[j] === '}' || input[j] === ']')) {
          // Skip this comma!
          continue;
        }
      }

      output += char;
    } else {
      output += char;
    }
  }

  return output;
}

/**
 * Intelligently merges multiple top-level JSON objects (e.g. project_info + shots)
 */
export function mergeJsonObjects(objects: any[]): any {
  if (objects.length === 0) return {};
  if (objects.length === 1) return objects[0];

  const merged: any = {};
  for (const obj of objects) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) continue;

    for (const [key, value] of Object.entries(obj)) {
      if (key === 'shots' && Array.isArray(value)) {
        if (!Array.isArray(merged.shots)) merged.shots = [];
        merged.shots.push(...value);
      } else if (key === 'project_info' && typeof value === 'object' && value !== null) {
        merged.project_info = { ...(merged.project_info || {}), ...value };
      } else if (key === 'character_bible' && Array.isArray(value)) {
        if (!Array.isArray(merged.character_bible)) merged.character_bible = [];
        merged.character_bible.push(...value);
      } else if (key === 'character_voice_mapping' && typeof value === 'object' && value !== null) {
        merged.character_voice_mapping = { ...(merged.character_voice_mapping || {}), ...value };
      } else {
        merged[key] = value;
      }
    }
  }
  return merged;
}

/**
 * Main function: Resiliently extracts, cleans, and parses JSON from any raw text.
 */
export function extractAndParseResilientJson(raw: any): ResilientJsonResult {
  // If already an object
  if (raw && typeof raw === 'object') {
    return {
      success: true,
      data: raw,
      wasCleaned: false,
      cleanActions: []
    };
  }

  if (typeof raw !== 'string') {
    return {
      success: false,
      error: "محتوى الملف فارغ أو ليس نصاً صالحاً.",
      wasCleaned: false,
      cleanActions: []
    };
  }

  const cleanActions: string[] = [];

  // Step 1: Direct parse test (fast path)
  const trimmed = raw.trim();
  try {
    const directParsed = JSON.parse(trimmed);
    return {
      success: true,
      data: directParsed,
      cleanedText: JSON.stringify(directParsed, null, 2),
      wasCleaned: false,
      cleanActions: []
    };
  } catch {
    // Continue to resilient extraction
  }

  // Step 2: Strip invisible characters
  let text = stripInvisibleCharacters(trimmed);
  if (text !== trimmed) {
    cleanActions.push("إزالة محارف التشفير الخفية (BOM)");
  }

  // Step 3: Strip markdown fences
  const fenceResult = stripMarkdownFences(text);
  if (fenceResult.stripped) {
    text = fenceResult.text;
    cleanActions.push("إزالة وسوم الماركداون (```json)");
  }

  // Step 4: Extract balanced JSON block(s)
  // This solves the exact error: "Unexpected non-whitespace character after JSON at position..."
  const blocks = extractBalancedJsonBlocks(text);

  if (blocks.length > 0) {
    cleanActions.push(`عزل كائن السيناريو وتجاهل أي نصوص أو شروح لاحقة (${blocks.length} كتل)`);

    const parsedBlocks: any[] = [];
    for (const block of blocks) {
      try {
        const parsed = JSON.parse(block);
        parsedBlocks.push(parsed);
      } catch {
        // Try cleaning syntax issues (trailing commas, comments)
        try {
          const cleanedBlock = cleanJsonSyntaxIssues(block);
          const parsed = JSON.parse(cleanedBlock);
          cleanActions.push("تصحيح فواصل زائدة أو تعليقات داخل الكود");
          parsedBlocks.push(parsed);
        } catch {
          // Block failed, continue
        }
      }
    }

    if (parsedBlocks.length > 0) {
      const finalData = mergeJsonObjects(parsedBlocks);
      return {
        success: true,
        data: finalData,
        cleanedText: JSON.stringify(finalData, null, 2),
        wasCleaned: true,
        cleanActions
      };
    }
  }

  // Step 5: Full text syntax cleanup fallback
  try {
    const fullyCleaned = cleanJsonSyntaxIssues(text);
    const parsed = JSON.parse(fullyCleaned);
    return {
      success: true,
      data: parsed,
      cleanedText: JSON.stringify(parsed, null, 2),
      wasCleaned: true,
      cleanActions: [...cleanActions, "تنظيف الفواصل والتعليقات الزائدة"]
    };
  } catch (err: any) {
    // Provide human-friendly error details
    const msg = String(err?.message || err);
    return {
      success: false,
      error: `تعذر قراءة ملف الـ JSON: ${msg}. تأكد من صحة بناء الأقواس والفواصل داخل الملف.`,
      wasCleaned: false,
      cleanActions
    };
  }
}
