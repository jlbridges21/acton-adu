import { useSeries } from "../context/SeriesContext";

const selectClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

export default function SeriesSelect({ id, value, onChange, required = true }) {
  const { seriesNames } = useSeries();
  const options =
    value && !seriesNames.includes(value) ? [value, ...seriesNames] : seriesNames;

  return (
    <select
      id={id}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={selectClass}
    >
      <option value="" disabled>
        Select series…
      </option>
      {options.map((series) => (
        <option key={series} value={series}>
          {series}
        </option>
      ))}
    </select>
  );
}
