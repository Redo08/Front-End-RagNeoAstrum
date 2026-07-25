import ChatApp from "@/components/ChatApp";

export default function Home() {
  return (
    <div className="relative h-screen w-full">
      <div className="dot-grid" />
      <div className="constellation-bg" />
      <ChatApp />
    </div>
  );
}
