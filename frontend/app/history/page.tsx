"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CloudRain,
  ImageOff,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { deleteScan, getScans } from "@/lib/api";
import { getSessionId } from "@/lib/session";
import type { ScanRecord } from "@/types/scan";

function formatPercent(value?: number | null) {
  if (typeof value !== "number") {
    return "n/a";
  }
  return `${Math.round(value * 100)}%`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown date";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function HistoryPage() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [scanPendingDelete, setScanPendingDelete] = useState<ScanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadScans() {
      setLoading(true);
      setError(null);
      try {
        const nextScans = await getScans(getSessionId());
        setScans(nextScans);
        setSelectedScan(nextScans[0] ?? null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load scan history.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadScans();
  }, []);

  async function handleDelete(scanId: string) {
    setDeletingId(scanId);
    setError(null);
    try {
      await deleteScan(scanId);
      setScans((current) => {
        const nextScans = current.filter((scan) => scan.id !== scanId);
        setSelectedScan((selected) =>
          selected?.id === scanId ? nextScans[0] ?? null : selected,
        );
        return nextScans;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete scan.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-lg border border-leaf-100 bg-white/82 p-5 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-leaf-900 sm:text-4xl">
              Scan History
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Previous scans saved for this browser session.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-leaf-100 bg-white px-3 py-2 text-sm font-semibold text-leaf-700 transition hover:bg-leaf-50"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Scanner
          </Link>
        </header>

        {error ? (
          <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="grid min-h-72 place-items-center rounded-lg border border-leaf-100 bg-white p-8 shadow-soft">
            <div className="flex items-center gap-3 text-sm font-semibold text-leaf-700">
              <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
              Loading scan history
            </div>
          </div>
        ) : scans.length === 0 ? (
          <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-leaf-100 bg-white/72 p-8 text-center shadow-soft">
            <div>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-leaf-50 text-leaf-700">
                <CalendarClock aria-hidden="true" className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-leaf-900">
                No scans saved yet.
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                Save a completed scan from the scanner page and it will appear here.
              </p>
            </div>
          </div>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
            <div className="space-y-3">
              {scans.map((scan) => (
                <button
                  type="button"
                  key={scan.id}
                  onClick={() => setSelectedScan(scan)}
                  className={`relative flex w-full gap-3 overflow-hidden rounded-lg border p-3 pl-4 text-left shadow-soft transition hover:border-leaf-200 ${
                    selectedScan?.id === scan.id
                      ? "border-leaf-300 bg-leaf-50 ring-2 ring-leaf-100"
                      : "border-leaf-100 bg-white"
                  }`}
                >
                  {selectedScan?.id === scan.id ? (
                    <span className="absolute inset-y-0 left-0 w-1 bg-leaf-600" />
                  ) : null}
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {scan.image_url ? (
                      <img
                        src={scan.image_url}
                        alt="Saved tomato leaf scan"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-slate-400">
                        <ImageOff aria-hidden="true" className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-leaf-900">
                      {scan.prediction ?? "Saved scan"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Confidence: {formatPercent(scan.confidence)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(scan.created_at)}
                    </p>
                    {scan.weather_risk ? (
                      <p className="mt-1 text-xs font-medium text-sky-700">
                        Weather risk: {scan.weather_risk}
                      </p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            {selectedScan ? (
              <ScanDetail
                scan={selectedScan}
                deleting={deletingId === selectedScan.id}
                onDelete={() => setScanPendingDelete(selectedScan)}
              />
            ) : null}
          </section>
        )}
      </div>
      {scanPendingDelete ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-scan-title"
        >
          <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700">
                <AlertTriangle aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="delete-scan-title"
                  className="text-lg font-semibold text-slate-950"
                >
                  Delete saved scan?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This removes the history entry for{" "}
                  <span className="font-semibold text-slate-800">
                    {scanPendingDelete.prediction ?? "this scan"}
                  </span>
                  . Stored image cleanup is not included yet.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setScanPendingDelete(null)}
                disabled={deletingId === scanPendingDelete.id}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const scanId = scanPendingDelete.id;
                  setScanPendingDelete(null);
                  void handleDelete(scanId);
                }}
                disabled={deletingId === scanPendingDelete.id}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {deletingId === scanPendingDelete.id ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                )}
                Delete scan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ScanDetail({
  scan,
  deleting,
  onDelete,
}: {
  scan: ScanRecord;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-leaf-100 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-normal text-slate-500">
              Prediction
            </p>
            <h2 className="mt-1 text-2xl font-bold text-leaf-900">
              {scan.prediction ?? "Saved scan"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Confidence: {formatPercent(scan.confidence)}
            </p>
          </div>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            )}
            Delete
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">{formatDate(scan.created_at)}</p>
      </section>

      <section className="rounded-lg border border-leaf-100 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-semibold text-leaf-900">Images</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <SavedImage title="Original" url={scan.image_url} />
          <SavedImage title="Grad-CAM++" url={scan.gradcam_url} />
          <SavedImage title="LIME" url={scan.lime_url} />
        </div>
      </section>

      {scan.top_predictions?.length ? (
        <section className="rounded-lg border border-leaf-100 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-semibold text-leaf-900">Top matches</h2>
          <div className="mt-4 space-y-2">
            {scan.top_predictions.map((prediction, index) => (
              <div
                key={`${prediction.raw_label}-${index}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="font-medium text-slate-800">
                  {prediction.label}
                </span>
                <span className="font-semibold text-slate-700">
                  {formatPercent(prediction.confidence)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {scan.explanation ? (
        <section className="rounded-lg border border-leaf-100 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-semibold text-leaf-900">Guidance</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {scan.explanation}
          </p>
          {scan.next_steps?.length ? (
            <ul className="mt-3 space-y-2">
              {scan.next_steps.map((step) => (
                <li key={step} className="text-sm leading-6 text-slate-700">
                  {step}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {scan.weather_risk || typeof scan.combined_risk_score === "number" ? (
        <section className="rounded-lg border border-sky-100 bg-sky-50 p-5 shadow-soft">
          <div className="flex items-start gap-2 text-sky-900">
            <CloudRain aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="text-xl font-semibold">Weather context</h2>
              {scan.weather_risk ? (
                <p className="mt-2 text-sm leading-6">
                  Weather risk: {scan.weather_risk}
                </p>
              ) : null}
              {typeof scan.combined_risk_score === "number" ? (
                <p className="text-sm leading-6">
                  Combined risk score: {formatPercent(scan.combined_risk_score)}
                </p>
              ) : null}
              {scan.location_name ? (
                <p className="mt-1 text-xs font-medium text-sky-700">
                  {scan.location_name}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {scan.disclaimer ? (
        <p className="rounded-lg border border-leaf-100 bg-white p-4 text-xs leading-5 text-slate-500 shadow-soft">
          {scan.disclaimer}
        </p>
      ) : null}
    </div>
  );
}

function SavedImage({ title, url }: { title: string; url?: string | null }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-normal text-slate-500">
        {title}
      </h3>
      <div className="grid aspect-square place-items-center overflow-hidden rounded-lg bg-slate-100">
        {url ? (
          <img src={url} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 px-3 text-center text-sm text-slate-500">
            <ImageOff aria-hidden="true" className="h-6 w-6 text-slate-400" />
            <span>Not saved</span>
          </div>
        )}
      </div>
    </div>
  );
}
