export default function PageHeader({
  title,
  description,
  badge,
  action,
  breadcrumbs,
}) {
  return (
    <div className="mb-6 border-b border-slate-200/80 pb-5">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-1.5">
          <ol className="flex items-center space-x-1.5 text-xs font-medium text-slate-400">
            {breadcrumbs.map((crumb, idx) => (
              <li key={idx} className="flex items-center space-x-1.5">
                {idx > 0 && <span className="text-slate-300">/</span>}
                <span className={idx === breadcrumbs.length - 1 ? "text-slate-700 font-semibold" : ""}>
                  {crumb}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            {badge && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/80">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
