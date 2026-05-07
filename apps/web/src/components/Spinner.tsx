export function Spinner({ size = 36 }: { size?: number }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"2.5rem", gap:"0.75rem" }}>
      <div style={{
        width: size, height: size,
        border: "3px solid var(--border, #e2e8f0)",
        borderTopColor: "var(--green, #2d6a4f)",
        borderRadius: "50%",
        animation: "halal-spin 0.7s linear infinite"
      }} />
      <style>{`@keyframes halal-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
