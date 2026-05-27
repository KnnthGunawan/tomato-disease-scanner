import { ShieldAlert } from "lucide-react";

type Props = {
  text: string;
};

export default function Disclaimer({ text }: Props) {
  return (
    <section className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
      <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />
      <p>{text}</p>
    </section>
  );
}
