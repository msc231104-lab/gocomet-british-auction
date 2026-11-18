export default function PageHeader({
  title,
  description,
  badge,
  action,
  breadcrumbs,
}) {
  return (
    <div className="mb-8 border-b border-slate-200/80 pb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-500">
            {breadcrumbs.map((crumb, idx) => (
              <li key={idx} className="flex items-center space-x-2">
                {idx > 0 && <span className="text-slate-400">/</span>}
                <span className={idx === breadcrumbs.length - 1 ? "text-slate-800" : ""}>
                  {crumb}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            {badge && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1.5 text-sm sm:text-base text-slate-600 max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
