type Dimension = {
  dimension: number;
  score: number;
  words: string[];
};

export default function DimensionsPanel({
  data,
}: {
  data: Dimension[];
}) {
  if (!data.length) {
    return <div className="dimensions-empty">No insights available</div>;
  }

  return (
    <div className="dimensions-panel">
      <h3 className="dimensions-title">Top Dimensions</h3>

      {data.slice(0, 3).map((d, i) => (
        <div key={d.dimension} className="dimension-row">
          <div className="dimension-rank">
            #{i + 1}
          </div>

          <div className="dimension-content">
            <div className="dimension-words">
              {d.words.map((w, j) => (
                <span key={j} className="dimension-word">{w}</span>
              ))}
            </div>

            <div className="dimension-bar">
              <div
                className="dimension-bar-fill"
                style={{ width: `${d.score * 100}%` }}
              />
            </div>
          </div>

          {/* <div className="dimension-words">
            {d.words.map((w, i) => (
              <span key={i} className="dimension-word">
                {w}
              </span>
            ))}
          </div> */}
        </div>
      ))}
    </div>
  );
}
