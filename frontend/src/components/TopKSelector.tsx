const TOPK_OPTIONS = [
  { label: "All", value: 100 },
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "30", value: 30 },
];

type Props = {
  value: number;
  onChange: (n: number) => void;
};

export default function TopKSelector({ value, onChange }: Props) {
  return (
    <div className="topk-row">
      <span className="topk-label">Top Patterns:</span>
      {TOPK_OPTIONS.map(({ label, value: n }) => (
        <button
          key={n}
          className={`topk-pill ${value === n ? "active" : ""}`}
          onClick={() => onChange(n)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}