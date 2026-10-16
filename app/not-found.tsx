import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-[#0B0F19] text-white">
      <h1 className="text-4xl font-bold mb-4">404 - الصفحة غير موجودة</h1>
      <p className="text-slate-400 mb-6">عذراً، الصفحة التي تبحث عنها غير متوفرة في استوديو الدبلجة.</p>
      <Link
        href="/"
        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-white font-medium transition"
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
