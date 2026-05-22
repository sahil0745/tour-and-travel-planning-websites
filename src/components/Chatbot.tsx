import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([
    { role: "bot", content: "Hi! I'm your AeroVoyage AI assistant. Ask me about destinations, budgets, safety, food — anything travel! 🌍" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, sessionId }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages(prev => [...prev, { role: "bot", content: data.reply }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "bot", content: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <div className="floating-ai-wrapper">
            <div className="ai-message">
              <span>AI is optimizing your journey</span>
            </div>
            <button className="chatbot-btn" onClick={() => setIsOpen(true)} aria-label="Open chat assistant">
              <Bot className="w-8 h-8" />
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-[var(--color-teal)]/30 flex flex-col z-50 overflow-hidden bg-[var(--color-navy)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-ocean)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-grad-1)] to-[var(--color-teal)] flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold font-display text-[var(--color-text)]">AeroVoyage AI</h3>
                  <p className="text-xs text-[var(--color-teal)] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" /> Online
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-full transition-colors"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-navy)]" style={{ scrollbarWidth: "thin" }}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "bg-[var(--color-surface)] border border-[var(--color-border)]" : "bg-gradient-to-br from-[var(--color-grad-1)] to-[var(--color-teal)] text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                  }`}>
                    {msg.role === "user" ? <User className="w-4 h-4 text-[var(--color-text)]" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] rounded-tr-none"
                      : "bg-gradient-to-br from-[var(--color-grad-1)] to-[var(--color-teal)] text-white rounded-tl-none shadow-[0_5px_15px_rgba(6,182,212,0.2)]"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-grad-1)] to-[var(--color-teal)] flex items-center justify-center shrink-0 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--color-teal)]" />
                    <span className="text-sm text-[var(--color-text-secondary)]">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-ocean)]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about destinations, budgets..."
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full pl-5 pr-12 py-3.5 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-teal)] focus:ring-1 focus:ring-[var(--color-teal)] transition-all placeholder:text-[var(--color-text-secondary)]"
                  aria-label="Chat message input"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2 bg-[var(--color-teal)] text-white rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
