/**
 * Pixel yarn ball, drawn on a 16x16 grid with square "pixels" so it stays
 * crisp at any size and matches the chart aesthetic (every cell is a stitch).
 */
export default function YarnMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {/* ball body */}
      <path fill="#1f1b2e" d="M5 1h6v1H5zM3 2h2v1H3zM11 2h2v1h-2zM2 3h1v2H2zM13 3h1v2h-1zM1 5h1v6H1zM14 5h1v6h-1zM2 11h1v2H2zM13 11h1v2h-1zM3 13h2v1H3zM11 13h2v1h-2zM5 14h6v1H5z" />
      <path fill="#e2483d" d="M5 2h6v1H5zM3 3h10v2H3zM2 5h12v6H2zM3 11h10v2H3zM5 13h6v1H5z" />
      {/* wound strands */}
      <path fill="#b8322a" d="M6 3h1v1H6zM5 4h1v1H5zM4 5h1v2H4zM5 7h1v1H5zM6 8h1v1H6zM7 9h1v1H7zM8 10h1v1H8zM9 11h1v1H9zM10 12h1v1h-1z" />
      <path fill="#b8322a" d="M10 3h1v1h-1zM11 4h1v2h-1zM10 6h1v1h-1zM9 7h1v1H9zM8 8h1v1H8zM7 10h1v1H7zM6 11h1v1H6zM5 12h1v1H5z" />
      {/* loose tail */}
      <path fill="#1f1b2e" d="M13 6h1v1h-1zM14 7h1v1h-1zM15 8h1v3h-1z" />
      <path fill="#f2b53c" d="M12 6h1v1h-1zM13 7h1v1h-1zM14 8h1v3h-1z" />
    </svg>
  );
}
