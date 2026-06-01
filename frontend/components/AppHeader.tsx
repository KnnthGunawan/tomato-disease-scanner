import { Leaf } from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/scanner", label: "Scan" },
  { href: "/weather-risk", label: "Weather Risk" },
  { href: "/history", label: "History" },
  { href: "/about-model", label: "About Model" },
];

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/78 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <Link href="/" className="inline-flex items-center gap-3 text-leaf-900">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-leaf-700 to-tomato-600 text-white shadow-soft">
            <Leaf aria-hidden="true" className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-xl font-bold tracking-normal">
              TomaDoctor
            </span>
            <span className="block text-xs font-semibold text-slate-500">
              Tomato health dashboard
            </span>
          </span>
        </Link>
        <nav className="hidden flex-wrap gap-2 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-leaf-50 hover:text-leaf-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
