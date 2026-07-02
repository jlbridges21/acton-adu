import cors from "cors";
import express from "express";
import { compressPdfBuffer } from "./compressPdf.mjs";

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());

/**
 * POST /api/compress-pdf
 * Body: raw PDF bytes (application/pdf)
 * Response: compressed PDF bytes
 *
 * Requires Ghostscript (`gs`) on the host machine.
 * Vercel's default serverless runtime does not include Ghostscript.
 */
app.post(
  "/api/compress-pdf",
  express.raw({ type: "application/pdf", limit: "150mb" }),
  async (req, res) => {
    if (!req.body?.length) {
      res.status(400).json({ error: "Request body must contain a PDF file." });
      return;
    }

    try {
      const result = await compressPdfBuffer(req.body);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("X-Compressed-Size-Mb", result.sizeMb.toFixed(2));
      res.setHeader("X-Compression-Preset", result.preset);
      res.send(Buffer.from(result.bytes));
    } catch (error) {
      res.status(500).json({
        error: error.message || "PDF compression failed.",
      });
    }
  },
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`PDF compression API listening on http://localhost:${port}`);
});
