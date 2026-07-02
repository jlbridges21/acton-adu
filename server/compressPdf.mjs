import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Ghostscript PDF quality presets. Requires `gs` installed on the server host. */
export const QUALITY_PRESETS = {
  screen: "/screen",
  ebook: "/ebook",
  printer: "/printer",
  prepress: "/prepress",
};

function runGhostscript(inputPath, outputPath, preset) {
  return new Promise((resolve, reject) => {
    const args = [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      `-dPDFSETTINGS=${preset}`,
      "-r300",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      `-sOutputFile=${outputPath}`,
      inputPath,
    ];

    const process = spawn("gs", args);
    let stderr = "";

    process.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    process.on("error", (error) => {
      reject(
        new Error(
          `Ghostscript is not available on this server (${error.message}). Install Ghostscript to enable PDF compression.`,
        ),
      );
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `Ghostscript failed with exit code ${code}.`));
    });
  });
}

/**
 * Compress a PDF buffer with Ghostscript.
 * Tries /ebook first, then /screen if the result is still over 12 MB.
 */
export async function compressPdfBuffer(inputBytes) {
  const id = randomUUID();
  const inputPath = join(tmpdir(), `catalog-input-${id}.pdf`);
  const ebookOutputPath = join(tmpdir(), `catalog-ebook-${id}.pdf`);
  const screenOutputPath = join(tmpdir(), `catalog-screen-${id}.pdf`);

  await writeFile(inputPath, inputBytes);

  try {
    await runGhostscript(inputPath, ebookOutputPath, QUALITY_PRESETS.ebook);
    let outputBytes = await readFile(ebookOutputPath);
    let preset = "ebook";

    const ebookSizeMb = outputBytes.length / (1024 * 1024);
    if (ebookSizeMb > 12) {
      await runGhostscript(inputPath, screenOutputPath, QUALITY_PRESETS.screen);
      outputBytes = await readFile(screenOutputPath);
      preset = "screen";
      await unlink(screenOutputPath).catch(() => {});
    }

    await unlink(ebookOutputPath).catch(() => {});

    return {
      bytes: new Uint8Array(outputBytes),
      sizeMb: outputBytes.length / (1024 * 1024),
      preset,
      compressed: true,
    };
  } finally {
    await unlink(inputPath).catch(() => {});
  }
}
