import type { ReactNode } from "react";

type Props = {
  children?: ReactNode;
};

export default function PageFooter({ children }: Props) {
  return (
    <footer className="mt-auto w-full border-t border-leaf-100 bg-white/78 px-4 py-3 text-xs text-slate-600 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-leaf-900">
            © 2026 TomaDoctor. All rights reserved.
          </p>
          <p className="max-w-3xl leading-5">
            AI screening aid only; confirm with expert agricultural guidance.
          </p>
        </div>
        {children ? (
          <div className="shrink-0 text-left leading-5 md:text-right">
            {children}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
