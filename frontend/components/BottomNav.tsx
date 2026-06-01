import { CloudSun, History, Home, ScanLine } from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/scanner", label: "Scan", icon: ScanLine },
  { href: "/weather-risk", label: "Weather", icon: CloudSun },
  { href: "/history", label: "History", icon: History },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-3xl border border-white/70 bg-white/88 p-2 shadow-2xl backdrop-blur-xl md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold text-slate-600 transition hover:bg-leaf-50 hover:text-leaf-800"
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
