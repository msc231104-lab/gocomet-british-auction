export default function StatCard({
  title,
  value,
  caption,
  icon: Icon,
  badgeText,
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </span>
        {badgeText && (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600">
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
