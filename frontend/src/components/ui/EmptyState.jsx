export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryNote,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center sm:py-16">
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-800 border border-blue-100 shadow-xs mb-4">
          <Icon className="h-7 w-7" />
        </div>
      )}

      <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-md text-sm text-slate-500 leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}

      {secondaryNote && (
        <p className="mt-4 text-xs text-slate-400">
          {secondaryNote}
        </p>
      )}
    </div>
  );
}
