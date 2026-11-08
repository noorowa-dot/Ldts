"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#17150f", color: "#fbf6ec", fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: 28 }}>Something went wrong.</h1>
          <p style={{ opacity: 0.7 }}>Your recipes are safe. Please try again.</p>
          <button onClick={reset} style={{ marginTop: 16, height: 48, padding: "0 24px", borderRadius: 999, border: 0, background: "#e5482f", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
