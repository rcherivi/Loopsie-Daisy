/**
 * Chat component — only rendered when USE_LLM = True in routes.py.
 *
 * Rendered inline, directly below the AI summary banner.
 * When the backend returns a search_term event, it calls onSearchTerm
 * to update the search bar and results above.
 * When the LLM response contains pattern recommendations, onAiPatterns
 * is called with the list of pattern titles so the parent can reorder results.
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
  onAiPatterns: (titles: string[]) => void;
  summaryData?: {
    summary: string;
    best_match: { name: string; link: string } | null;
  } | null;
  patterns?: {
    title: string;
    description: string;
    skill_level: string;
    pattern_link?: string;
  }[];
}

/**
 * Extract the recommended_patterns JSON block from the LLM reply.
 * Returns the array of titles, or [] if the block is absent / malformed.
 */
function extractRecommendedPatterns(text: string): string[] {
  try {
    const match = text.match(
      /\{\s*"recommended_patterns"\s*:\s*\[[\s\S]*?\]\s*\}/,
    );
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.recommended_patterns)) {
        return (parsed.recommended_patterns as string[]).filter(
          (t) => typeof t === "string" && t.trim().length > 0,
        );
      }
    }
  } catch {
    /* ignore parse errors */
  }
  return [];
}

/**
 * Fuzzy-match LLM-generated titles against the known pattern list.
 * Uses Jaccard word-overlap so slight title variations (extra words,
 * missing suffixes) still resolve to the correct stored title.
 */
function fuzzyMatchTitles(
  llmTitles: string[],
  knownPatterns: { title: string; description: string; skill_level: string }[],
): string[] {
  const tokenise = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  const matched: string[] = [];
  const usedTitles = new Set<string>();
  for (const llmTitle of llmTitles) {
    const llmTokens = new Set(tokenise(llmTitle));
    let bestScore = 0;
    let bestTitle = "";
    for (const p of knownPatterns) {
      if (usedTitles.has(p.title)) continue;
      const pTokens = tokenise(p.title);
      const overlap = pTokens.filter((t) => llmTokens.has(t)).length;
      const union = new Set([...llmTokens, ...pTokens]).size;
      const score = union > 0 ? overlap / union : 0;
      if (score > bestScore) {
        bestScore = score;
        bestTitle = p.title;
      }
    }
    // Accept match if >= 40% token overlap — avoids spurious matches
    if (bestScore >= 0.4 && bestTitle) {
      matched.push(bestTitle);
      usedTitles.add(bestTitle);
    }
  }
  return matched;
}

/**
 * Remove the raw JSON recommendation block from the text shown to the user.
 */
function stripRecommendationJson(text: string): string {
  return text
    .replace(/\{\s*"recommended_patterns"\s*:\s*\[[\s\S]*?\]\s*\}/g, "")
    .trim();
}

function Chat({
  onSearchTerm,
  onAiPatterns,
  summaryData,
  patterns,
}: ChatProps): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
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

    // Build context from current search results using labeled format so the
    // LLM sees the exact stored TITLE and is instructed to copy it verbatim.
    const exactTitles = patterns?.map((p) => p.title) ?? [];
    const patternContext =
      patterns && patterns.length > 0
        ? `Current search results — use these EXACT titles when recommending patterns:\n${patterns
            .map(
              (p, i) =>
                `${i + 1}.\n  TITLE: ${p.title}\n  DESCRIPTION: ${p.description?.slice(0, 150) ?? ""}\n  LINK: ${p.pattern_link ?? "N/A"}`,
            )
            .join("\n\n")}`
        : "";

    const summaryContext = summaryData
      ? `AI Summary: ${summaryData.summary}\nBest Match: ${summaryData.best_match?.name ?? "N/A"}`
      : "";

    // Tell the LLM exactly how to emit recommendations — copy TITLE values verbatim.
    const jsonInstruction =
      exactTitles.length > 0
        ? `\n\nIMPORTANT: At the very end of your reply, after your explanation, append this JSON block. Copy the TITLE values exactly as written above — do not rephrase, shorten, or add extra words:\n{"recommended_patterns": ["<exact TITLE value>", "<exact TITLE value>"]}`
        : "";

    const contextBlock =
      [patternContext, summaryContext].filter(Boolean).join("\n\n---\n\n") +
      jsonInstruction;

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
                const displayText = stripRecommendationJson(assistantText);
                setMessages((prev) => [
                  ...prev.slice(0, -1),
                  {
                    text: displayText,
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

      // After streaming completes, extract pattern recommendations.
      // Step 1: try the structured JSON block (exact titles).
      let recommended = extractRecommendedPatterns(assistantText);

      // Step 2: if the JSON block is missing or empty, fall back to fuzzy
      // matching the LLM's free-text bullet-point titles against known patterns.
      if (recommended.length === 0 && patterns && patterns.length > 0) {
        // Extract bullet/numbered list items from the assistant reply
        const bulletTitles: string[] = [];
        for (const line of assistantText.split("\n")) {
          const m = line.match(
            /^\s*(?:\d+\.|[-*•])\s+\*{0,2}([^*\n]+?)\*{0,2}(?:\s*[:(]|$)/,
          );
          if (m) {
            const candidate = m[1].trim();
            if (candidate.length > 3 && candidate.length < 150) {
              bulletTitles.push(candidate);
            }
          }
        }
        if (bulletTitles.length > 0) {
          recommended = fuzzyMatchTitles(bulletTitles, patterns);
        }
      }

      // Step 3: even if JSON block was found, fuzzy-resolve any titles that
      // didn't exactly match a known pattern (LLM sometimes paraphrases).
      if (recommended.length > 0 && patterns && patterns.length > 0) {
        const knownTitleSet = new Set(patterns.map((p) => p.title));
        const unmatched = recommended.filter((t) => !knownTitleSet.has(t));
        if (unmatched.length > 0) {
          const fuzzyResolved = fuzzyMatchTitles(unmatched, patterns);
          recommended = [
            ...recommended.filter((t) => knownTitleSet.has(t)),
            ...fuzzyResolved,
          ];
        }
      }

      // Strip the JSON block from the displayed message
      const cleanText = stripRecommendationJson(assistantText);
      if (cleanText !== stripRecommendationJson("")) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            ...prev[prev.length - 1],
            text: cleanText,
          },
        ]);
      }
      if (recommended.length > 0) {
        onAiPatterns(recommended);
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
      {/* Floating action button — always visible */}
      <button className="chat-fab" onClick={() => setIsOpen((o) => !o)}>
        <span>✨</span>
        {isOpen ? "Close Chat" : "Ask AI"}
      </button>

      {/* Modal panel — shown when open */}
      {isOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-header-info">
              <span className="chat-header-title">✨ Ask a Follow-up</span>
              <span className="chat-header-sub">
                Refine results with a follow-up question
              </span>
            </div>
          </div>

          <div id="messages">
            {messages.length === 0 && (
              <p className="chat-empty-hint">
                Ask me to narrow down the results — e.g. "show me only
                beginner-friendly ones" or "which ones use chunky yarn?"
              </p>
            )}
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
                            j === i
                              ? { ...m, showThinking: !m.showThinking }
                              : m,
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
