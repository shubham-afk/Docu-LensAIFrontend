import { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";

// ============================================================================
// Document Intelligence Dashboard
// Stack: React + Tailwind + daisyUI
// ----------------------------------------------------------------------------
// Wire this to your Django backend by replacing `mockExtract()` with a real
// fetch() to your /api/documents/extract endpoint.
// ============================================================================

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXT = [".pdf", ".doc", ".docx"];
const MAX_SIZE_MB = 25;

// ---- Mock extraction (replace with API call) -------------------------------


// ---- Helpers ---------------------------------------------------------------
const fmtBytes = (b) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 ** 2).toFixed(2)} MB`;
};

const toCSV = (result) => {
  const lines = [];
  lines.push("# Key Fields");
  lines.push("label,value,confidence");
  result.keyFields.forEach((f) =>
    lines.push(`"${f.label}","${f.value}",${f.confidence}`)
  );
  result.tables.forEach((t) => {
    lines.push("");
    lines.push(`# ${t.name}`);
    lines.push(t.columns.map((c) => `"${c}"`).join(","));
    t.rows.forEach((r) => lines.push(r.map((c) => `"${c}"`).join(",")));
  });
  lines.push("");
  lines.push("# Entities");
  lines.push("type,text,count");
  result.entities.forEach((e) =>
    lines.push(`${e.type},"${e.text}",${e.count}`)
  );
  return lines.join("\n");
};

const download = (filename, content, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ============================================================================
// Components
// ============================================================================

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-neutral text-neutral-content">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <path d="M14 3v5h5" />
          <path d="M8 13h8M8 17h5" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-base-content/60">
          Doc Intel
        </div>
        <div className="font-semibold tracking-tight">Dashboard</div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-base-content/50">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-base-content/60">{hint}</div>}
    </div>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 95 ? "bg-success" : pct >= 85 ? "bg-warning" : "bg-error";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-base-300">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[11px] text-base-content/60">{pct}%</span>
    </div>
  );
}

function DropZone({ onFile, error }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const handle = (file) => {
    if (!file) return;
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!ACCEPTED_EXT.includes(ext)) {
      onFile(null, `Unsupported file type. Use ${ACCEPTED_EXT.join(", ")}`);
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      onFile(null, `File exceeds ${MAX_SIZE_MB}MB limit`);
      return;
    }
    onFile(file, null);
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-8 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-base-content/50">
          Step 01 — Upload
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          Turn documents into{" "}
          <span className="italic text-primary">structured data</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base-content/60">
          Drop an invoice, contract, or report. We extract key fields, tables,
          and entities — ready to export as CSV or JSON.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed bg-base-100 px-8 py-16 text-center transition-all ${drag
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-base-300 hover:border-primary/60 hover:bg-base-200/40"
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXT.join(",")}
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0])}
        />

        {/* decorative grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-neutral text-neutral-content shadow-lg transition-transform group-hover:-translate-y-1">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12m0-12 4 4m-4-4-4 4" />
              <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
            </svg>
          </div>
          <div className="mt-5 text-lg font-medium">
            Drop your document here, or{" "}
            <span className="text-primary underline underline-offset-4">
              browse
            </span>
          </div>
          <div className="mt-2 font-mono text-xs text-base-content/50">
            PDF · DOC · DOCX  ·  up to {MAX_SIZE_MB}MB
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <span className="font-mono text-xs text-base-content/50">
          or try a sample →
        </span>
        {[
          { name: "sample-invoice.pdf", type: "Invoice" },
          { name: "sample-contract.docx", type: "Contract" },
          { name: "sample-report.pdf", type: "Report" },
        ].map((s) => (
          <button
            key={s.name}
            onClick={() => {
              const fake = new File(["sample"], s.name, {
                type: "application/pdf",
              });
              Object.defineProperty(fake, "size", { value: 184320 });
              onFile(fake, null);
            }}
            className="btn btn-sm btn-outline rounded-full"
          >
            {s.type}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-3">
        {[
          ["01", "OCR + parse"],
          ["02", "AI extract"],
          ["03", "Export"],
        ].map(([n, t]) => (
          <div key={n} className="rounded-xl border border-base-300 p-3 text-center">
            <div className="font-mono text-[10px] text-base-content/50">{n}</div>
            <div className="mt-1 text-sm font-medium">{t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcessingView({ file, stage }) {
  const stages = [
    { key: "upload", label: "Uploading" },
    { key: "ocr", label: "Running OCR" },
    { key: "extract", label: "Extracting fields" },
    { key: "done", label: "Finalizing" },
  ];
  const idx = stages.findIndex((s) => s.key === stage);

  return (
    <div className="mx-auto w-full max-w-xl py-16">
      <div className="rounded-2xl border border-base-300 bg-base-100 p-8">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-neutral text-neutral-content">
            <span className="loading loading-spinner loading-md" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{file.name}</div>
            <div className="font-mono text-xs text-base-content/50">
              {fmtBytes(file.size)}
            </div>
          </div>
        </div>

        <ul className="mt-8 space-y-3">
          {stages.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <li key={s.key} className="flex items-center gap-3">
                <div
                  className={`grid h-6 w-6 place-items-center rounded-full border ${done
                    ? "border-success bg-success text-success-content"
                    : active
                      ? "border-primary"
                      : "border-base-300"
                    }`}
                >
                  {done ? (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                  ) : active ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <span className="font-mono text-[10px] text-base-content/40">
                      {i + 1}
                    </span>
                  )}
                </div>
                <span
                  className={
                    active
                      ? "font-medium"
                      : done
                        ? "text-base-content/60"
                        : "text-base-content/40"
                  }
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function ResultsView({ result, onReset }) {
  const [tab, setTab] = useState("fields");
  const [query, setQuery] = useState("");

  const filteredFields = result.keyFields.filter((f) =>
    (f.label + f.value).toLowerCase().includes(query.toLowerCase())
  );

  const entityColors = {
    ORG: "badge-primary",
    PERSON: "badge-secondary",
    DATE: "badge-accent",
    MONEY: "badge-success",
    LOCATION: "badge-warning",
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-base-300 bg-base-100 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-success/15 text-success">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <div className="font-medium">{result.fileName}</div>
            <div className="font-mono text-xs text-base-content/50">
              {result.docType} · {result.pages} pages · {fmtBytes(result.fileSize)} · {(result.processingMs / 1000).toFixed(1)}s
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-sm btn-outline"
            onClick={() =>
              download(
                result.fileName.replace(/\.[^.]+$/, "") + ".json",
                JSON.stringify(result, null, 2),
                "application/json"
              )
            }
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
            JSON
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() =>
              download(
                result.fileName.replace(/\.[^.]+$/, "") + ".csv",
                toCSV(result),
                "text/csv"
              )
            }
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
            CSV
          </button>
          <button className="btn btn-sm btn-ghost" onClick={onReset}>
            New
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Doc type"
          value={result.docType}
          hint="Classified by model"
        />
        <Stat
          label="Confidence"
          value={`${Math.round(result.confidence * 100)}%`}
          hint="Overall extraction"
        />
        <Stat
          label="Fields found"
          value={result.keyFields.length}
          hint={`${result.tables.length} tables`}
        />
        <Stat
          label="Entities"
          value={result.entities.length}
          hint="Named entities"
        />
      </div>

      {/* Main layout */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left: preview */}
        <aside className="lg:col-span-4">
          <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-base-content/50">
                Preview
              </div>
              <span className="badge badge-sm badge-ghost font-mono">
                p. 1 / {result.pages}
              </span>
            </div>
            <div className="aspect-[1/1.3] overflow-hidden rounded-lg border border-base-300 bg-base-200/50 p-6">
              <div className="space-y-2">
                <div className="h-3 w-1/2 rounded bg-base-300" />
                <div className="h-2 w-3/4 rounded bg-base-300/70" />
                <div className="h-2 w-2/3 rounded bg-base-300/70" />
                <div className="mt-4 h-2 w-full rounded bg-base-300/50" />
                <div className="h-2 w-full rounded bg-base-300/50" />
                <div className="h-2 w-5/6 rounded bg-base-300/50" />
                <div className="mt-4 grid grid-cols-3 gap-1">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-3 rounded bg-base-300/40" />
                  ))}
                </div>
                <div className="mt-4 h-2 w-1/3 rounded bg-base-300/50" />
                <div className="h-2 w-1/4 rounded bg-base-300/50" />
                <div className="mt-6 h-8 w-24 rounded bg-primary/20" />
              </div>
            </div>
            <div className="mt-3 text-xs text-base-content/50">
              Replace with real page-render from your backend (e.g. pdf.js thumbnails).
            </div>
          </div>
        </aside>

        {/* Right: tabbed data */}
        <section className="lg:col-span-8">
          <div className="rounded-2xl border border-base-300 bg-base-100">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-4 py-3">
              <div role="tablist" className="tabs tabs-boxed bg-base-200">
                <button
                  role="tab"
                  className={`tab ${tab === "fields" ? "tab-active" : ""}`}
                  onClick={() => setTab("fields")}
                >
                  Key Fields
                </button>
                <button
                  role="tab"
                  className={`tab ${tab === "tables" ? "tab-active" : ""}`}
                  onClick={() => setTab("tables")}
                >
                  Tables
                </button>
                <button
                  role="tab"
                  className={`tab ${tab === "entities" ? "tab-active" : ""}`}
                  onClick={() => setTab("entities")}
                >
                  Entities
                </button>
              </div>
              {tab === "fields" && (
                <label className="input input-bordered input-sm flex w-full items-center gap-2 md:max-w-xs">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-60" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <input
                    type="text"
                    placeholder="Filter fields…"
                    className="grow"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              )}
            </div>

            <div className="p-4">
              {tab === "fields" && (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr className="text-base-content/60">
                        <th className="font-mono text-[10px] uppercase tracking-wider">
                          Field
                        </th>
                        <th className="font-mono text-[10px] uppercase tracking-wider">
                          Value
                        </th>
                        <th className="font-mono text-[10px] uppercase tracking-wider">
                          Confidence
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFields.map((f) => (
                        <tr key={f.label} className="hover">
                          <td className="text-base-content/70">{f.label}</td>
                          <td className="font-medium">{f.value}</td>
                          <td>
                            <ConfidenceBar value={f.confidence} />
                          </td>
                        </tr>
                      ))}
                      {filteredFields.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="py-8 text-center text-base-content/50"
                          >
                            No fields match “{query}”
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === "tables" &&
                result.tables.map((t) => (
                  <div key={t.name} className="mb-6 last:mb-0">
                    <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-base-content/50">
                      {t.name}
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-base-300">
                      <table className="table table-sm">
                        <thead className="bg-base-200">
                          <tr>
                            {t.columns.map((c) => (
                              <th key={c}>{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {t.rows.map((r, i) => (
                            <tr key={i} className="hover">
                              {r.map((c, j) => (
                                <td key={j} className={j === 0 ? "" : "font-mono text-sm"}>
                                  {c}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

              {tab === "entities" && (
                <div className="flex flex-wrap gap-2">
                  {result.entities.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-base-300 px-3 py-2"
                    >
                      <span
                        className={`badge badge-sm ${entityColors[e.type] || "badge-ghost"} font-mono text-[10px]`}
                      >
                        {e.type}
                      </span>
                      <span className="text-sm font-medium">{e.text}</span>
                      <span className="font-mono text-[10px] text-base-content/50">
                        ×{e.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================================================
// App
// ============================================================================

export default function App() {
  const [view, setView] = useState("upload"); // upload | processing | results
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState("upload");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const handleFile = useCallback((f, err) => {
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setFile(f);
    setView("processing");
    setStage("upload");
  }, []);

  // Simulated processing pipeline
  useEffect(() => {
    if (view !== "processing" || !file) return;
    let active = true;
    const run = async () => {

      const seq = ["upload", "ocr", "extract", "done"];

      for (const s of seq) {

        if (!active) return;

        setStage(s);

        await new Promise((r) => setTimeout(r, 500));
      }

      try {

        const formData = new FormData();

        formData.append("file", file);

        const response = await axios.post(
          "http://127.0.0.1:8000/api/upload/",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        const data = response.data;

        const ai = data.ai_analysis;

        const resultData = {

          fileName: data.metadata.file_name,

          fileSize: data.metadata.file_size,

          pages: data.metadata.pages,

          docType: data.metadata.doc_type,

          confidence: 0.95,

          processingMs: 2000,

          keyFields: [

            {
              label: "Document Type",
              value: ai.document_type,
              confidence: 0.95,
            },

            {
              label: "Summary",
              value: ai.summary,
              confidence: 0.92,
            },

            {
              label: "Name",
              value: ai.important_fields?.name || "N/A",
              confidence: 0.95,
            },

            {
              label: "Email",
              value: ai.important_fields?.email || "N/A",
              confidence: 0.95,
            },

            {
              label: "Phone",
              value: ai.important_fields?.phone || "N/A",
              confidence: 0.95,
            },

            {
              label: "Skills",
              value: ai.important_fields?.skills?.join(", ") || "N/A",
              confidence: 0.90,
            },

            {
              label: "Organizations",
              value: ai.important_fields?.organizations?.join(", ") || "N/A",
              confidence: 0.90,
            },

            {
              label: "Projects",
              value: ai.important_fields?.projects?.join(", ") || "N/A",
              confidence: 0.90,
            },
          ],

          tables: [],

          entities: [

            ...(ai.important_fields?.name
              ? [
                {
                  type: "PERSON",
                  text: ai.important_fields.name,
                  count: 1,
                },
              ]
              : []),

            ...(ai.important_fields?.email
              ? [
                {
                  type: "EMAIL",
                  text: ai.important_fields.email,
                  count: 1,
                },
              ]
              : []),

            ...(ai.important_fields?.phone
              ? [
                {
                  type: "PHONE",
                  text: ai.important_fields.phone,
                  count: 1,
                },
              ]
              : []),

            ...(ai.important_fields?.organizations || []).map((org) => ({
              type: "ORG",
              text: org,
              count: 1,
            })),
          ],
        };

        setResult(resultData);

        setHistory((h) => [
          {
            name: file.name,
            type: "PDF",
            at: Date.now(),
          },
          ...h,
        ].slice(0, 6));

        setView("results");

      } catch (error) {

        console.error(error);

        setError("Upload failed");

        setView("upload");
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [view, file]);

  const reset = () => {
    setFile(null);
    setResult(null);
    setView("upload");
  };

  return (
    <div className="min-h-screen bg-base-200/40 text-base-content">
      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-base-300 bg-base-100/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            <a className="btn btn-ghost btn-sm">Docs</a>
            <a className="btn btn-ghost btn-sm">API</a>
            <a className="btn btn-ghost btn-sm">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden font-mono text-[11px] text-base-content/50 md:block">
              v0.1 · demo
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-neutral"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.53-1.34-1.3-1.7-1.3-1.7-1.07-.73.08-.72.08-.72 1.18.08 1.8 1.21 1.8 1.21 1.05 1.79 2.76 1.27 3.43.97.11-.76.41-1.27.74-1.56-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.17.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.2-1.48 3.17-1.17 3.17-1.17.63 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.42.36.8 1.07.8 2.16v3.21c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" /></svg>
              Code
            </a>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-7xl px-4 py-10">
        {view === "upload" && (
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-9">
              <DropZone onFile={handleFile} error={error} />
            </div>
            <aside className="lg:col-span-3">
              <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-base-content/50">
                  Recent
                </div>
                {history.length === 0 ? (
                  <p className="mt-3 text-sm text-base-content/50">
                    No documents yet. Upload one to get started.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {history.map((h, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-base-300 p-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {h.name}
                          </div>
                          <div className="font-mono text-[10px] text-base-content/50">
                            {h.type}
                          </div>
                        </div>
                        <span className="badge badge-ghost badge-sm">✓</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-base-300 bg-neutral p-5 text-neutral-content">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">
                  How it works
                </div>
                <ol className="mt-3 space-y-2 text-sm">
                  <li>
                    <span className="font-mono text-[10px] opacity-60">01</span>{" "}
                    Upload your document
                  </li>
                  <li>
                    <span className="font-mono text-[10px] opacity-60">02</span>{" "}
                    OCR + LLM extract structured data
                  </li>
                  <li>
                    <span className="font-mono text-[10px] opacity-60">03</span>{" "}
                    Review, edit, export as CSV / JSON
                  </li>
                </ol>
              </div>
            </aside>
          </div>
        )}

        {view === "processing" && file && (
          <ProcessingView file={file} stage={stage} />
        )}

        {view === "results" && result && (
          <ResultsView result={result} onReset={reset} />
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-base-content/50">
          <div>© 2026 · Document Intelligence Dashboard</div>
          <div>Built with Django · React · Tailwind · daisyUI</div>
        </div>
      </footer>
    </div>
  );
}