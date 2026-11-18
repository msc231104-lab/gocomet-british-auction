export default function StatCard({
  title,
  value,
  caption,
  icon: Icon,
  badgeText,
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-100">
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 font-mono">
          {value}
        </span>
        {badgeText && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
            {badgeText}
          </span>
        )}
      </div>

      {caption && (
        <p className="mt-1 text-xs text-slate-500">
          {caption}
        </p>
      )}
    </div>
  );
}
