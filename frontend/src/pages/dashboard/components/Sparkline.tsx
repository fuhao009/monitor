interface Props {
  values: number[];
}

export function Sparkline({ values }: Props) {
  const width = 220;
  const height = 90;
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / Math.max(max - min, 1)) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 90 }}>
      <polyline fill="none" stroke="#1677ff" strokeWidth="3" points={points} />
    </svg>
  );
}
