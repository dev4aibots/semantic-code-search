import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Semantic Code Search — dev4aibots demo",
  description:
    "Ask a codebase in plain English. Hybrid retrieval (dense embeddings + BM25 + reciprocal rank fusion) running entirely in the browser session — no credentials, no external calls.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// Runs before paint: applies the stored theme (or leaves the OS default).
const themeScript = `(function(){try{var t=localStorage.getItem('scs-theme');if(t==='dark'||t==='light'){document.documentElement.classList.add(t);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
