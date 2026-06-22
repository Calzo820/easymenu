export default function Skeleton({ height = 18, width = "100%", radius = 14, className = "" }) {
  return <div className={["em-skeleton", className].filter(Boolean).join(" ")} style={{ height, width, borderRadius: radius }} />;
}
