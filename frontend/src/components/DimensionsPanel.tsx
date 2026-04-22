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

      {data.slice(0, 3).map((d) => (
        <div key={d.dimension} className="dimension-row">
          <div className="dimension-score">
            + {d.score.toFixed(3)}
          </div>

          <div className="dimension-content">
            <div className="dimension-words-container">
              {d.words.map((w, j) => (
                <span key={j} className="dimension-word">{w}</span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
