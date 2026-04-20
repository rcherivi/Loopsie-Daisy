import React from "react";

type Dimension = {
  dimension: number;
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

      {data.map((d) => (
        <div key={d.dimension} className="dimension-block">
          <div className="dimension-header">
            Dimension {d.dimension}
          </div>

          <div className="dimension-words">
            {d.words.map((w, i) => (
              <span key={i} className="dimension-word">
                {w}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
