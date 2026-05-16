// import { useNavigate } from "react-router-dom";

// export default function HomePage() {
//   const navigate = useNavigate();

//   const features = [
//     {
//       title: "Semantic Search",
//       desc: "Search intelligently across uploaded documents",
//       route: "/semantic-search",
//     },
//   ];

//   return (
//     <div className="min-h-screen bg-base-200 p-10">
//       <div className="mx-auto max-w-6xl">
//         <h1 className="text-5xl font-bold">
//           Document Intelligence Platform
//         </h1>

//         <p className="mt-4 text-base-content/60">
//           AI-powered workflows for documents.
//         </p>

//         <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
//           {features.map((f) => (
//             <div
//               key={f.title}
//               onClick={() => navigate(f.route)}
//               className="cursor-pointer rounded-2xl border bg-base-100 p-6 transition hover:scale-[1.02]"
//             >
//               <h2 className="text-xl font-semibold">
//                 {f.title}
//               </h2>

//               <p className="mt-2 text-sm text-base-content/60">
//                 {f.desc}
//               </p>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }


import { useNavigate } from "react-router-dom";

const processes = [
  {
    title: "Semantic Search",
    desc: "Search intelligently across uploaded documents",
    route: "/semantic-search",
    icon: "🔍",
    badge: "NLP · RAG",
    color: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base-200 font-sans">
      {/* Top bar */}
      <header className="border-b border-base-300 bg-base-100 px-6 py-3 flex items-center gap-3">
        <span className="font-mono text-[10px] tracking-widest text-base-content/40 uppercase">
          Document Intelligence Platform
        </span>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        {/* Hero */}
        <p className="font-mono text-[10px] tracking-widest text-base-content/40 uppercase mb-2">
          Overview
        </p>
        <h1 className="text-3xl font-bold leading-tight text-base-content mb-2">
          Your document<br />workflows, unified.
        </h1>
        <p className="text-sm text-base-content/50 mb-8">
          AI-powered processing across every document pipeline.
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { label: "Processes", value: processes.length },
            { label: "Status", value: "Active", valueClass: "text-success" },
            { label: "AI Model", value: "Claude", valueClass: "text-sm pt-1" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-base-100 border border-base-300 p-4">
              <p className="text-[11px] text-base-content/40 mb-1">{s.label}</p>
              <p className={`text-xl font-semibold text-base-content ${s.valueClass ?? ""}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Process list */}
        <p className="font-mono text-[10px] tracking-widest text-base-content/40 uppercase mb-3 pl-1">
          Available processes
        </p>

        <div className="rounded-2xl border border-base-300 bg-base-100 overflow-hidden divide-y divide-base-300">
          {processes.map((p, i) => (
            <button
              key={p.route}
              onClick={() => navigate(p.route)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-base-200 active:scale-[0.995] transition-all duration-150 group"
            >
              {/* Index */}
              <span className="font-mono text-[11px] text-base-content/30 w-5 text-right shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Icon */}
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ${p.color}`}
              >
                {p.icon}
              </span>

              {/* Body */}
              <span className="flex-1 min-w-0">
                <p className="text-sm font-medium text-base-content leading-snug">{p.title}</p>
                <p className="text-xs text-base-content/50 truncate">{p.desc}</p>
              </span>

              {/* Badge */}
              <span className="font-mono text-[10px] text-base-content/40 border border-base-300 rounded-full px-2.5 py-1 shrink-0">
                {p.badge}
              </span>

              {/* Arrow */}
              <span className="text-base-content/30 group-hover:text-base-content group-hover:translate-x-0.5 transition-all duration-150 shrink-0">
                →
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}