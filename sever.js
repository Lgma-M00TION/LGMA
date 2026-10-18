
import express from "express";
import multer from "multer";
import cors from "cors";
import OpenAI from "openai";

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(
      null,
      ["image/png", "image/jpeg", "image/webp"].includes(file.mimetype)
    );
  }
});

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173"
}));

const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

app.get("/api/health", (_req, res) => {
  res.json({ status: "online", app: "LGMAM00TION" });
});

app.post("/api/analyze-chart", upload.single("chart"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Upload a PNG, JPG or WEBP chart screenshot."
      });
    }

    const symbol = String(req.body.symbol || "Unknown").slice(0, 30);
    const timeframe = String(req.body.timeframe || "Unknown").slice(0, 10);

    const confidence = Math.max(
      50, Math.min(95, Number(req.body.minimumConfidence) || 70)
    );

    const minConfirmations = Math.max(
      1, Math.min(8, Number(req.body.minimumConfirmations) || 3)
    );

    const image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const prompt = `
You are LGMAM00TION, a careful trading-chart image analyst.

Symbol: ${symbol}
Timeframe selected by user: ${timeframe}

Analyze these strategies individually:
${strategies.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Rules:
- Analyze only what is actually visible in the image.
- Explain the evidence and limitations for every strategy.
- Never claim RSI, volume, moving averages or indicators are confirmed
  when they are not visible.
- A screenshot may not contain enough information to establish every setup.
- Return BUY, SELL or WAIT based on the evidence.
- Confidence is an assessment of visible evidence, not a win probability.
- Never force a BUY or SELL.
- Return numeric entry, stop loss and TP1, TP2, TP3 only if prices
  and a defensible setup can be identified.
- If prices are unreadable or the setup is insufficient, use null levels
  and WAIT.
- BUY: SL < entry < TP1 < TP2 < TP3.
- SELL: TP3 < TP2 < TP1 < entry < SL.
- Each strategy must have an evidence-based finding. Clearly identify
  unavailable evidence.
- Do not pretend that all strategies agree.

Return only valid JSON in this format:
{
  "direction": "BUY",
  "confidence": 72,
  "entry": null,
  "sl": null,
  "tp1": null,
  "tp2": null,
  "tp3": null,
  "reasons": ["Evidence observed in the screenshot"],
  "strategies": [
    {"name": "Market Structure (BOS / CHoCH)", "finding": "Observed evidence"}
  ]
}

Use direction BUY, SELL or WAIT. Include all 12 exact strategy names.
`;

    const response = await ai.responses.create({
      model: "gpt-4.1-mini",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: image }
        ]
      }]
    });

    const raw = response.output_text;
    if (!raw) throw new Error("Empty AI response");

    const data = JSON.parse(
      raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "")
    );

    if (
      !["BUY", "SELL", "WAIT"].includes(data.direction) ||
      typeof data.confidence !== "number" ||
      !Array.isArray(data.strategies) ||
      !Array.isArray(data.reasons)
    ) {
      throw new Error("Invalid AI response structure");
    }

    const findings = strategies.map(name => {
      const item = data.strategies.find(s => s.name === name);
      return {
        name,
        finding: typeof item?.finding === "string"
          ? item.finding
          : "Not evaluated; no finding returned."
      };
    });

    const count = findings.filter(s =>
      s.finding.trim() &&
      !/not visible|cannot verify|not evaluated|insufficient data|unknown/i.test(s.finding)
    ).length;

    const { entry, sl, tp1, tp2, tp3 } = data;

    const levelsValid = [entry, sl, tp1, tp2, tp3].every(
      n => typeof n === "number" && Number.isFinite(n) && n > 0
    );

    const geometryValid = levelsValid && (
      data.direction === "BUY"
        ? sl < entry && entry < tp1 && tp1 < tp2 && tp2 < tp3
        : data.direction === "SELL"
          ? tp3 < tp2 && tp2 < tp1 && tp1 < entry && entry < sl
          : false
    );

    const validTrade =
      data.direction !== "WAIT" &&
      data.confidence >= confidence &&
      count >= minConfirmations &&
      geometryValid;

    res.json({
      direction: validTrade ? data.direction : "WAIT",
      confidence: Math.max(0, Math.min(100, data.confidence)),
      entry: validTrade ? entry : null,
      sl: validTrade ? sl : null,
      tp1: validTrade ? tp1 : null,
      tp2: validTrade ? tp2 : null,
      tp3: validTrade ? tp3 : null,
      reasons: data.reasons,
      strategies: findings,
      confirmations: count
    });
  } catch (error) {
    console.error("Scanner error:", error.message);
    res.status(500).json({
      error: "AI analysis failed. Check server configuration and try again."
    });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`LGMAM00TION backend listening on ${port}`);
});
