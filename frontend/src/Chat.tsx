import { useState, useRef, useEffect } from "react";
import SearchIcon from "./assets/mag.png";

interface Message {
  text: string;
  isUser: boolean;
}
interface ChatProps {
  onSearchTerm: (term: string) => void;
}

function Chat({ onSearchTerm }: ChatProps): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setMessages((prev) => [...prev, { text, isUser: true }]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          { text: "Oops! Yarn tangled. Try again?", isUser: false },
        ]);
        setLoading(false);
        return;
      }
      let assistantText = "";
      setMessages((prev) => [...prev, { text: "", isUser: false }]);
      setLoading(false);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.search_term) onSearchTerm(data.search_term);
              if (data.content) {
                assistantText += data.content;
                setMessages((prev) => [
                  ...prev.slice(0, -1),
                  { text: assistantText, isUser: false },
                ]);
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { text: "Lost connection to the crochet shop!", isUser: false },
      ]);
      setLoading(false);
    }
  };

  return (
    <>
      <div id="messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message ${msg.isUser ? "user" : "assistant"}`}
          >
            <p>{msg.text}</p>
          </div>
        ))}
        {loading && (
          <div className="loading-indicator visible">
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span className="loading-dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-bar">
        <form className="input-row" onSubmit={sendMessage}>
          <img src={SearchIcon} alt="" style={{ width: "20px" }} />
          <input
            placeholder="Ask Loopsie Daisy about crochet..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            autoComplete="off"
          />
          <button type="submit" disabled={loading}>
            Send 🌼
          </button>
        </form>
      </div>
    </>
  );
}
export default Chat;
