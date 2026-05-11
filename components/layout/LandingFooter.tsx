import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="font-space-grotesk text-lg font-black italic uppercase text-white">
            🏀 23Board
          </span>
          <p className="text-xs uppercase tracking-widest text-gray-500">
            © 2025 23Board. All Rights Reserved.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <Link
            href="#"
            className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            개인정보처리방침
          </Link>
          <Link
            href="#"
            className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            이용약관
          </Link>
          <Link
            href="#"
            className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            문의하기
          </Link>
        </div>
      </div>
    </footer>
  );
}
