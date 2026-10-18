
import React, { useRef, useState } from "react";
import {
  ScanLine, Home, History, Settings, Upload,
  TrendingUp, TrendingDown, LoaderCircle, Image as ImageIcon
} from "lucide-react";

const strategies = [
  "Market Structure (BOS / CHoCH)",
  "Support & Resistance",
  "Supply & Demand",
  "Smart Money Concepts (Order Blocks / FVG)",
  "Liquidity Sweeps",
  "Trendlines & Channels",
  "Fibonacci Retracement",
  "Candlestick Patterns",
  "Chart Patterns",
  "Moving Averages",
  "RSI / Momentum Divergence",
  "Volume & Price Action"
];

type Result = {
  direction: "BUY" | "SELL" | "WAIT";
  confidence: number;
  entry: number | null;
  sl: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  reasons: string[];
  strategies: { name: string; finding: string }[];
};

export default function App() {
  const [page, setPage] = useState("home");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [symbol, setSymbol] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("M15");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("lgma-history") || "[]");
    } catch {
      return [];
    }
  });
  const [accent, setAccent] = useState(
    localStorage.getItem("lgma-accent") || "#ffbd22"
  );
  const [confidence, setConfidence] = useState(70);
  const [confirmations, setConfirmations] = useState(3);
  const [showReasons, setShowReasons] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  function saveHistory(items: Result[]) {
    setHistory(items);
    localStorage.setItem("lgma-history", JSON.stringify(items));
  }

  function uploadImage(selected?: File) {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setMessage("Please choose a chart screenshot.");
      return;
    }
    if (selected.size > 12 * 1024 * 1024) {
      setMessage("Image must be smaller than 12 MB.");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setMessage("");
  }

  async function scan() {
    if (!file) {
      setMessage("Upload a chart screenshot before scanning.");
      return;
    }

    setLoading(true);
    setResult(null);
    setMessage("Analyzing chart screenshot and strategies...");

    const body = new FormData();
    body.append("chart", file);
    body.append("symbol", symbol);
    body.append("timeframe", timeframe);
    body.append("minimumConfidence", String(confidence));
    body.append("minimumConfirmations", String(confirmations));

    try {
      const response = await fetch("/api/analyze-chart", {
        method: "POST",
        body
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      if (
        !["BUY", "SELL", "WAIT"].includes(data.direction) ||
        !Array.isArray(data.strategies)
      ) {
        throw new Error("Invalid scanner response.");
      }

      setResult(data);
      saveHistory([data, ...history].slice(0, 500));
      setMessage("Analysis complete.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Cannot connect to the AI scanner."
      );
    } finally {
      setLoading(false);
    }
  }

  const buttonStyle = {
    borderColor: accent,
    color: accent
  };

  function Header() {
    return (
      <header className="brand">
        <div className="logo">LX</div>
        <h1>LGMAM00TION</h1>
      </header>
    );
  }

  function HomePage() {
    return (
      <>
        <section className="hero">
          <div className="robot">◈</div>
          <p className="eyebrow">AI TRADING INTELLIGENCE</p>
          <h2>YOUR CHART.<br />YOUR SIGNAL.</h2>
          <p className="muted">
            Upload a screenshot to examine price action,
            market structure and potential trade setups.
          </p>
          <button className="primary" onClick={() => setPage("scan")}>
            <ScanLine size={20} /> START SCANNING
          </button>
        </section>

        <div className="stats">
          <div><small>TOTAL SCANS</small><strong>{history.length}</strong></div>
          <div><small>BUY SIGNALS</small><strong>{history.filter(x => x.direction === "BUY").length}</strong></div>
          <div><small>SELL SIGNALS</small><strong>{history.filter(x => x.direction === "SELL").length}</strong></div>
        </div>
        <p className="muted center">
          Unlimited app scans; AI provider limits and charges may apply.
        </p>
      </>
    );
  }

  function ScanPage() {
    return (
      <>
        <button className="back" onClick={() => setPage("home")}>← Dashboard</button>
        <h2 className="section-title">CHART SCANNER</h2>
        <p className="muted">Upload a chart screenshot to begin.</p>

        <div className="fields">
          <label>Symbol
            <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} />
          </label>
          <label>Timeframe
            <select value={timeframe} onChange={e => setTimeframe(e.target.value)}>
              {["M1","M5","M15","M30","H1","H4","D1","W1"].map(t =>
                <option key={t}>{t}</option>
              )}
            </select>
          </label>
        </div>

        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={e => uploadImage(e.target.files?.[0])} />

        <button className="upload" onClick={() => fileRef.current?.click()}>
          {preview
            ? <img src={preview} className="chart-preview" alt="Chart screenshot" />
            : <>
                <ImageIcon size={40} />
                <strong>UPLOAD CHART SCREENSHOT</strong>
                <span>PNG, JPG or WEBP · Max 12 MB</span>
                <Upload size={24} />
              </>}
        </button>

        {file && <button className="back" onClick={() => {
          setFile(null); setPreview(""); setResult(null);
        }}>Remove screenshot</button>}

        <button className="primary full" onClick={scan} disabled={loading || !file}>
          {loading
            ? <><LoaderCircle className="spin" /> ANALYZING...</>
            : <><ScanLine size={20} /> SCAN CHART</>}
        </button>

        {message && <p className="notice">{message}</p>}

        {loading && <div className="panel">
          <h3>ANALYZING STRATEGIES</h3>
          {strategies.map(s => <p key={s}>◌ {s}</p>)}
          <p className="muted">Findings will appear after the server responds.</p>
        </div>}

        {result && <>
          <div className="panel result">
            <p className="eyebrow">AI ANALYSIS RESULT</p>
            <h2 className={result.direction.toLowerCase()}>
              {result.direction === "BUY" ? <TrendingUp /> :
                result.direction === "SELL" ? <TrendingDown /> : null}
              {result.direction === "BUY" ? " BUY / LONG" :
                result.direction === "SELL" ? " SELL / SHORT" : " WAIT"}
            </h2>
            <p>Evidence confidence: {result.confidence}%</p>

            {result.direction !== "WAIT" && <>
              <div className="levels">
                {[
                  ["ENTRY", result.entry],
                  ["STOP LOSS", result.sl],
                  ["TAKE PROFIT 1", result.tp1],
                  ["TAKE PROFIT 2", result.tp2],
                  ["TAKE PROFIT 3", result.tp3]
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <small>{label}</small>
                    <strong>{value ?? "Unavailable"}</strong>
                  </div>
                ))}
              </div>
            </>}

            {showReasons && result.reasons?.length > 0 && <>
              <h3>REASONS</h3>
              {result.reasons.map((r, i) => <p key={i}>{r}</p>)}
            </>}

            <h3>STRATEGY FINDINGS</h3>
            {strategies.map(name => {
              const item = result.strategies.find(s => s.name === name);
              return <div className="finding" key={name}>
                <strong>{name}</strong>
                <p>{item?.finding || "Not evaluated"}</p>
              </div>;
            })}
            <p className="muted">
              Signals are estimates, not guarantees. Verify prices before trading.
            </p>
          </div>
        </>}
      </>
    );
  }

  function HistoryPage() {
    return <>
      <h2 className="section-title">SIGNAL HISTORY</h2>
      {history.length === 0 && <p className="muted">No scans yet.</p>}
      {history.map((item, i) => (
        <button className="history-item" key={i} onClick={() => {
          setResult(item); setPage("scan");
        }}>
          <strong>{item.direction}</strong>
          <span>{item.confidence}% confidence</span>
        </button>
      ))}
      {history.length > 0 && <button className="back" onClick={() => {
        if (confirm("Clear all history?")) saveHistory([]);
      }}>Clear history</button>}
    </>;
  }

  function SettingsPage() {
    return <>
      <h2 className="section-title">SETTINGS</h2>
      <div className="panel">
        <label>Scanner accent colour
          <input type="color" value={accent} onChange={e => {
            setAccent(e.target.value);
            localStorage.setItem("lgma-accent", e.target.value);
          }} />
        </label>
        <label>Minimum confidence: {confidence}%
          <input type="range" min="50" max="95" step="5" value={confidence}
            onChange={e => setConfidence(Number(e.target.value))} />
        </label>
        <label>Minimum confirmations: {confirmations}
          <input type="range" min="1" max="8" value={confirmations}
            onChange={e => setConfirmations(Number(e.target.value))} />
        </label>
        <label className="check">
          <input type="checkbox" checked={showReasons}
            onChange={e => setShowReasons(e.target.checked)} />
          Show reasons for signals
        </label>
      </div>
    </>;
  }

  return (
    <div className="app" style={{ "--gold": accent } as React.CSSProperties}>
      <main>
        <Header />
        {page === "home" && <HomePage />}
        {page === "scan" && <ScanPage />}
        {page === "history" && <HistoryPage />}
        {page === "settings" && <SettingsPage />}
      </main>

      <footer>
        <h3>RAMAPHOSA SCANNER.</h3>
        <nav>
          {[
            ["home", "Home", <Home size={19} />],
            ["scan", "Scan", <ScanLine size={19} />],
            ["history", "History", <History size={19} />],
            ["settings", "Settings", <Settings size={19} />]
          ].map(([id, label, icon]) => (
            <button key={String(id)} className={page === id ? "active" : ""}
              onClick={() => setPage(String(id))}>
              {icon}<span>{label}</span>
            </button>
          ))}
        </nav>
      </footer>
    </div>
  );
}
