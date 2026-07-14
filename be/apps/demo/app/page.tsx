export default function Home() {
  return (
    <video
      src="/demo.mp4"
      autoPlay
      loop
      muted
      playsInline
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
}
