import { useState } from "react";
import axios from "axios";

async function callWithRetry(fn, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.response?.status;
      const canRetry = status === 503 || status === 429;
      if (!canRetry || i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delay * (i + 1)));
    }
  }
}

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    const userMessage = message.trim();
    if (!userMessage || loading) return;

    const updatedChat = [...chat, { role: "user", text: userMessage }];

    setChat(updatedChat);
    setMessage("");
    setLoading(true);

    try {
      const apiKey = import.meta.env.VITE_API_KEY;

      if (!apiKey) {
        throw new Error("API key nahi mili. Project ki .env file check karo.");
      }

      const response = await callWithRetry(() =>
        axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
          {
            contents: updatedChat.map((item) => ({
              role: item.role === "user" ? "user" : "model",
              parts: [{ text: item.text }],
            })),
          },
          { params: { key: apiKey } }
        )
      );

      const aiReply = response.data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("");

      if (!aiReply) {
        throw new Error("AI ka reply nahi mila.");
      }

      setChat((prev) => [...prev, { role: "ai", text: aiReply }]);
    } catch (error) {
      console.error("Gemini API Error:", error.response?.data || error.message);

      const status = error.response?.status;
      const errorMessage =
        status === 503
          ? "Server abhi busy hai, thori der baad dobara try karein."
          : error.response?.data?.error?.message || error.message;

      setChat((prev) => [...prev, { role: "ai", text: "Error: " + errorMessage }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        boxSizing: "border-box",
        textAlign: "center",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        background:
          "linear-gradient(135deg, #050b24, #0b1f5c 50%, #1e3a8a)",
      }}
    >
      <div
        style={{
          width: "90%",
          maxWidth: "600px",
          maxHeight: "55vh",
          overflowY: "auto",
          marginBottom: "16px",
          textAlign: "left",
        }}
      >
        {chat.map((item, index) => (
          <div
            key={index}
            style={{
              margin: "8px 0",
              padding: "10px 14px",
              borderRadius: "12px",
              background:
                item.role === "user"
                  ? "rgba(212,175,55,0.18)"
                  : "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <strong>{item.role === "user" ? "You: " : "AI: "}</strong>
            <span>{item.text}</span>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "8px",
          width: "90%",
          maxWidth: "450px",
          padding: "10px",
          borderRadius: "14px",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
        }}
      ><input
  type="text"
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  placeholder="Ask me anything..."
  disabled={loading}
  style={{
    flex: 1,
    padding: "12px 16px",
    fontSize: "16px",
    border: "none",
    borderRadius: "8px",
    outline: "none",
    backgroundColor: "white",
    color: "black",
  }}
/>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            fontWeight: 600,
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            color: "#fafbfd",
            background: "linear-gradient(135deg, #f5d77a, #c9a227)",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default App;