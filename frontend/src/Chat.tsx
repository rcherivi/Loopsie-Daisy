/**
 * Chat component — only rendered when USE_LLM = True in routes.py.
 *
 * Shows a message history and a chat input bar at the bottom.
 * When the backend returns a search_term event, it calls onSearchTerm
 * to update the search bar and results above.
 */
import { useState, useRef, useEffect } from "react";
import SearchIcon from "./assets/mag.png";

interface Message {
  text: string;
  thinking?: string;
  isUser: boolean;
  showThinking?: boolean;
}

interface ChatProps {
  onSearchTerm: (term: string) => void;
  summaryData?: {
    summary: string;
    best_match: { name: string; link: string } | null;
  } | null;
  patterns?: { title: string; description: string; skill_level: string }[];
}

function Chat({ onSearchTerm, summaryData, patterns }: ChatProps): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

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

    // Build context from current search results
    const patternContext =
      patterns && patterns.length > 0
        ? `Current search results:\n${patterns
          .map(
            (p, i) =>
              `${i + 1}. ${p.title} (${p.skill_level}) — ${p.description?.slice(0, 120)}...`,
          )
          .join("\n")}`
        : "";

    const summaryContext = summaryData
      ? `AI Summary: ${summaryData.summary}\nBest Match: ${summaryData.best_match?.name ?? "N/A"}`
      : "";

    const contextBlock = [patternContext, summaryContext]
      .filter(Boolean)
      .join("\n\n");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context: contextBlock,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          { text: "Error: " + (data.error || response.status), isUser: false },
        ]);
        setLoading(false);
        return;
      }

      let assistantText = "";
      let thinkingText = "";
      setMessages((prev) => [
        ...prev,
        { text: "", thinking: "", isUser: false, showThinking: false },
      ]);
      setLoading(false);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.search_term !== undefined) {
                onSearchTerm(data.search_term);
              }
              if (data.error) {
                setMessages((prev) => [
                  ...prev.slice(0, -1),
                  { text: "Error: " + data.error, isUser: false },
                ]);
                return;
              }
              if (data.thinking !== undefined) {
                thinkingText += data.thinking;
                setMessages((prev) => [
                  ...prev.slice(0, -1),
                  {
                    text: assistantText,
                    thinking: thinkingText,
                    isUser: false,
                    showThinking: prev[prev.length - 1]?.showThinking ?? false,
                  },
                ]);
              }
              if (data.content !== undefined) {
                assistantText += data.content;
                setMessages((prev) => [
                  ...prev.slice(0, -1),
                  {
                    text: assistantText,
                    thinking: thinkingText,
                    isUser: false,
                    showThinking: prev[prev.length - 1]?.showThinking ?? false,
                  },
                ]);
              }
            } catch {
              /* ignore malformed lines */
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { text: "Something went wrong. Check the console.", isUser: false },
      ]);
      setLoading(false);
    }
  };

  return (
    <div id="chat-root">
      {/* FAB — hidden when open */}
      {!open && (
        <button className="chat-fab" onClick={() => setOpen(true)}>
          💬 Ask about patterns …
        </button>
      )}

      {/* Modal panel */}
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-header-info">
              <span className="chat-header-title">Pattern Assistant</span>
              <span className="chat-header-sub">Ask me anything about patterns</span>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div id="messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`message ${msg.isUser ? "user" : "assistant"}`}
              >
                {/* thinking block */}
                {!msg.isUser && msg.thinking && (
                  <div className="thinking-block">
                    <button
                      className="thinking-toggle"
                      onClick={() =>
                        setMessages((prev) =>
                          prev.map((m, j) =>
                            j === i ? { ...m, showThinking: !m.showThinking } : m,
                          ),
                        )
                      }
                    >
                      {msg.showThinking ? "▲ Hide thinking" : "▼ Show thinking"}
                    </button>
                    {msg.showThinking && (
                      <p className="thinking-text">{msg.thinking}</p>
                    )}
                  </div>
                )}
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
              <img
                src={SearchIcon}
                alt=""
                width={20}
                height={20}
                style={{ flexShrink: 0 }}
              />
              <input
                type="text"
                placeholder="Ask about these patterns..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
              <button type="submit" disabled={loading}>
                ➤
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}

export default Chat;
// /**
//  * Chat component — only rendered when USE_LLM = True in routes.py.
//  *
//  * Shows a message history and a chat input bar at the bottom.
//  * When the backend returns a search_term event, it calls onSearchTerm
//  * to update the search bar and results above.
//  */
// import { useState, useRef, useEffect } from "react";
// import SearchIcon from "./assets/mag.png";

// interface Message {
//   text: string;
//   isUser: boolean;
// }

// interface ChatProps {
//   onSearchTerm: (term: string) => void;
// }

// function Chat({ onSearchTerm }: ChatProps): JSX.Element {
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [input, setInput] = useState<string>("");
//   const [loading, setLoading] = useState<boolean>(false);
//   const bottomRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     bottomRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages, loading]);

//   const sendMessage = async (e: React.FormEvent): Promise<void> => {
//     e.preventDefault();
//     const text = input.trim();
//     if (!text || loading) return;

//     setMessages((prev) => [...prev, { text, isUser: true }]);
//     setInput("");
//     setLoading(true);

//     try {
//       const response = await fetch("/api/chat", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ message: text }),
//       });

//       if (!response.ok) {
//         const data = await response.json();
//         setMessages((prev) => [
//           ...prev,
//           { text: "Error: " + (data.error || response.status), isUser: false },
//         ]);
//         setLoading(false);
//         return;
//       }

//       let assistantText = "";
//       setMessages((prev) => [...prev, { text: "", isUser: false }]);
//       setLoading(false);

//       const reader = response.body!.getReader();
//       const decoder = new TextDecoder();
//       let buffer = "";

//       while (true) {
//         const { done, value } = await reader.read();
//         if (done) break;
//         buffer += decoder.decode(value, { stream: true });
//         const lines = buffer.split("\n");
//         buffer = lines.pop() ?? "";
//         for (const line of lines) {
//           if (line.startsWith("data: ")) {
//             try {
//               const data = JSON.parse(line.slice(6));
//               if (data.search_term !== undefined) {
//                 onSearchTerm(data.search_term);
//               }
//               if (data.error) {
//                 setMessages((prev) => [
//                   ...prev.slice(0, -1),
//                   { text: "Error: " + data.error, isUser: false },
//                 ]);
//                 return;
//               }
//               if (data.content !== undefined) {
//                 assistantText += data.content;
//                 setMessages((prev) => [
//                   ...prev.slice(0, -1),
//                   { text: assistantText, isUser: false },
//                 ]);
//               }
//             } catch {
//               /* ignore malformed lines */
//             }
//           }
//         }
//       }
//     } catch {
//       setMessages((prev) => [
//         ...prev,
//         { text: "Something went wrong. Check the console.", isUser: false },
//       ]);
//       setLoading(false);
//     }
//   };

//   return (
//     <>
//       <div id="messages">
//         {messages.map((msg, i) => (
//           <div
//             key={i}
//             className={`message ${msg.isUser ? "user" : "assistant"}`}
//           >
//             <p>{msg.text}</p>
//           </div>
//         ))}
//         {loading && (
//           <div className="loading-indicator visible">
//             <span className="loading-dot" />
//             <span className="loading-dot" />
//             <span className="loading-dot" />
//           </div>
//         )}
//         <div ref={bottomRef} />
//       </div>

//       <div className="chat-bar">
//         <form className="input-row" onSubmit={sendMessage}>
//           {/* Add constants for placeholder text and aria-labels for
//           accessibility */}
//           <img
//             src={SearchIcon}
//             alt=""
//             width={20}
//             height={20}
//             style={{ flexShrink: 0 }}
//           />
//           <input
//             type="text"
//             placeholder="Ask the AI about Keeping Up with the Kardashians"
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             disabled={loading}
//             autoComplete="off"
//           />
//           <button type="submit" disabled={loading}>
//             Send
//           </button>
//         </form>
//       </div>
//     </>
//   );
// }

// export default Chat;
