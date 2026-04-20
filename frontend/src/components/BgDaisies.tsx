import React from "react";

// daisy
// function Daisy({
//   petalColor,
//   size = 64,
// }: {
//   petalColor: string;
//   size?: number;
// }) {
//   const c = size / 2;
//   const pr = size * 0.28;
//   const pd = size * 0.22;
//   const cr = size * 0.14;

//   const petals = Array.from({ length: 5 }, (_, i) => {
//     const angle = (i * 72 - 90) * (Math.PI / 180);
//     return (
//       <circle
//         key={i}
//         cx={c + Math.cos(angle) * pd}
//         cy={c + Math.sin(angle) * pd}
//         r={pr}
//         fill={petalColor}
//       />
//     );
//   });

//   return (
//     <svg
//       width={size}
//       height={size}
//       viewBox={`0 0 ${size} ${size}`}
//       xmlns="http://www.w3.org/2000/svg"
//     >
//       {petals}
//       <circle cx={c} cy={c} r={cr} fill="#f9e07a" />
//     </svg>
//   );
// }

type BgDaisyProps = {
  x: string;
  y: string;
  size: number;
  color: string;
};

function BgDaisy({ x, y, size, color }: BgDaisyProps) {
  const c = size / 2;
  const pr = size * 0.28;
  const pd = size * 0.22;
  const cr = size * 0.14;

  const petals = Array.from({ length: 5 }, (_, i) => {
    const angle = (i * 72 - 90) * (Math.PI / 180);
    return (
      <circle
        key={i}
        cx={c + Math.cos(angle) * pd}
        cy={c + Math.sin(angle) * pd}
        r={pr}
        fill={color}
      />
    );
  });

  return (
    <svg
      className="bg-daisy"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ left: x, top: y }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {petals}
      <circle cx={c} cy={c} r={cr} fill="#f9e07a" />
    </svg>
  );
}

export default function BgDaisies() {
  const daisies = [
    { x: "-60px", y: "5%", size: 260, color: "#f7c9d4" },
    { x: "72%", y: "-40px", size: 220, color: "#c8de9d" },
    { x: "88%", y: "28%", size: 180, color: "#f7c9d4" },
    { x: "10%", y: "38%", size: 200, color: "#e0eea3" },
    { x: "55%", y: "52%", size: 240, color: "#f7c9d4" },
    { x: "-30px", y: "68%", size: 190, color: "#c8de9d" },
    { x: "80%", y: "72%", size: 210, color: "#e0eea3" },
    { x: "35%", y: "82%", size: 170, color: "#f7c9d4" },
    { x: "27%", y: "25%", size: 100, color: "#e0eea3" },
    { x: "40%", y: "25%", size: 200, color: "#f7c9d4" },
    { x: "30%", y: "50%", size: 150, color: "#f7c9d4" },
    { x: "70%", y: "40%", size: 150, color: "#e0eea3" },
  ];

  return (
    <div className="bg-daisies" aria-hidden="true">
      {daisies.map((d, i) => (
        <BgDaisy key={i} {...d} />
      ))}
    </div>
  );
}