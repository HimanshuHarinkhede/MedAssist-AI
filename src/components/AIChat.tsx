import { useState, useRef, useEffect } from "react";
import { Send, Bot, Loader2, Paperclip, FileText, X, WifiOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { aiApi, getUser } from "@/lib/api";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
}

function TypingIndicator() {
  return (
    <div className="chat-bubble-ai flex items-center gap-1.5 w-fit">
      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-1" />
      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-2" />
      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-3" />
    </div>
  );
}

export function AIChat({ placeholder = "Ask a medical question..." }: { placeholder?: string }) {
  const currentUser = getUser();
  const isDoctor = currentUser?.role === "doctor";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content: isDoctor
        ? "Hello, Doctor! I'm your AI clinical assistant. Ask me about medications, drug interactions, dosing guidelines, or clinical decision support."
        : "Hello! I'm your AI health assistant. How can I help you today? You can ask me about medications, side effects, or general health questions.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [backendOffline, setBackendOffline] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const question = input.trim();
    if ((!question && !attachment) || isTyping) return;

    // Build display message
    let displayMessage = question;
    if (attachment) {
      displayMessage = `[Attached: ${attachment.name}]\n${question}`;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: displayMessage || "Please analyze this file.",
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachment(null);
    setIsTyping(true);
    setBackendOffline(false);

    // Build the actual question to send to AI
    // BUG FIX: was sending `question` instead of `finalQuestion`
    const finalQuestion = attachment && !question
      ? "Analyze this medical report and suggest possible conditions or recommendations."
      : question;

    try {
      const res = await aiApi.chat(finalQuestion, currentUser?.role) as any;
      const answer = res.data?.answer || "I couldn't process that. Please try again.";
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "ai", content: answer },
      ]);
    } catch (err: any) {
      const isAuthError = err?.message?.includes("401") || err?.message?.includes("authorized");
      const isNetworkError = err?.message?.includes("fetch") || err?.message?.includes("Failed to fetch");

      let errorMsg = "";
      if (isAuthError) {
        errorMsg = "Your session may have expired. Please log out and log in again.";
      } else if (isNetworkError) {
        setBackendOffline(true);
        errorMsg = "The AI backend is offline. Please ensure the server is running on port 5000.";
      } else {
        errorMsg = "I'm having trouble responding right now. Please try again in a moment.";
      }

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "ai", content: errorMsg },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const retryConnection = () => {
    setBackendOffline(false);
    // Send a test ping by trying to send the last user question
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      setInput(lastUserMsg.content);
    }
  };

  return (
    <div className="flex flex-col h-full">

      {/* Offline Banner */}
      <AnimatePresence>
        {backendOffline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 px-4 py-2.5 text-xs"
          >
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">Backend server is offline — responses may be unavailable.</span>
            <button
              onClick={retryConnection}
              className="flex items-center gap-1 hover:underline font-medium shrink-0"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "ai" && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}>
                {msg.role === "ai" ? (
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <TypingIndicator />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        {attachment && (
          <div className="flex items-center gap-2 mb-3 bg-muted w-fit px-3 py-1.5 rounded-lg border border-border">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium max-w-[200px] truncate">{attachment.name}</span>
            <button
              onClick={() => setAttachment(null)}
              className="p-1 hover:bg-muted-foreground/20 rounded-full transition-colors ml-1"
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => setAttachment(e.target.files?.[0] || null)}
            className="hidden"
            accept=".pdf,image/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            title="Attach a report or image (PDF, Image)"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <button
            onClick={handleSend}
            disabled={isTyping || (!input.trim() && !attachment)}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isTyping ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {isDoctor
            ? "Clinical AI assistant — always verify with current clinical guidelines."
            : "AI responses are for informational purposes only. Always consult your doctor."}
        </p>
      </div>
    </div>
  );
}
