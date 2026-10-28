export function Seitenkopf({
  titel,
  untertitel,
  aktionen,
}: {
  titel: string;
  untertitel?: React.ReactNode;
  aktionen?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{titel}</h1>
        {untertitel && <p className="mt-1 text-sm text-slate-600">{untertitel}</p>}
      </div>
      {aktionen && <div className="flex flex-wrap gap-2">{aktionen}</div>}
    </div>
  );
}
