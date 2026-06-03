import { BrainCircuit, CloudSun, Image as ImageIcon, ShieldCheck } from "lucide-react";

import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import PageFooter from "@/components/PageFooter";

const modelNotes = [
  {
    title: "Image screening",
    description:
      "The scanner first checks for a clear tomato leaf, then identifies the most likely disease class when the image is suitable.",
    icon: ImageIcon,
  },
  {
    title: "Explainability",
    description:
      "Grad-CAM++ and LIME highlight regions that influenced the model. These highlights are screening aids, not confirmed disease locations.",
    icon: BrainCircuit,
  },
  {
    title: "Weather context",
    description:
      "Humidity, rainfall, temperature, and forecast pressure help explain when fungal disease risk may be elevated.",
    icon: CloudSun,
  },
];

export default function AboutModelPage() {
  return (
    <main className="flex min-h-screen flex-col pb-28 md:pb-0">
      <AppHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/70 bg-white/78 p-6 shadow-soft backdrop-blur">
          <div className="inline-flex items-center gap-2 rounded-full bg-leaf-50 px-3 py-2 text-sm font-bold text-leaf-800">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            Responsible AI screening
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-normal text-leaf-900">
            About the TomaDoctor model
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            TomaDoctor supports tomato plant health decisions by combining image
            classification, model explanations, and local weather risk. It is a
            screening tool and should be used alongside visual inspection and
            local agricultural guidance.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {modelNotes.map((note) => {
            const Icon = note.icon;
            return (
              <article
                key={note.title}
                className="rounded-3xl border border-white/70 bg-white/78 p-5 shadow-soft backdrop-blur"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf-50 text-leaf-700">
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-leaf-900">
                  {note.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {note.description}
                </p>
              </article>
            );
          })}
        </section>
      </div>
      <PageFooter />
      <BottomNav />
    </main>
  );
}
