import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const demoScriptPath = path.resolve(__dirname, "../scripts/create-demo-users.js");

let demoSeedRunning = false;

function trimOutput(value) {
  const text = String(value || "").trim();
  if (text.length <= 2200) return text;
  return `${text.slice(0, 2200)}\n...`;
}

function runDemoSeed() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [demoScriptPath], {
      cwd: path.resolve(__dirname, ".."),
      env: process.env,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Creazione demo troppo lenta. Riprova tra poco o controlla il database."));
    }, 120000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout: trimOutput(stdout), stderr: trimOutput(stderr) });
      } else {
        reject(new Error(trimOutput(stderr || stdout) || `Seed demo terminato con codice ${code}`));
      }
    });
  });
}

export const ensureDemoAccount = async (_req, res) => {
  if (process.env.EASYMENU_DEMO_SEED_ENABLED === "false") {
    return res.status(403).json({
      message: "Creazione demo disattivata su questo ambiente",
    });
  }

  if (demoSeedRunning) {
    return res.status(409).json({
      message: "Demo già in preparazione. Riprova tra qualche secondo.",
    });
  }

  try {
    demoSeedRunning = true;
    const result = await runDemoSeed();

    return res.json({
      ok: true,
      message: "Account demo completo creato o aggiornato.",
      credentials: {
        email: "owner@demo.test",
        password: "EasyMenu2026!",
      },
      output: result.stdout,
    });
  } catch (error) {
    console.error("ensureDemoAccount error:", error);
    return res.status(500).json({
      ok: false,
      message: error.message || "Impossibile creare la demo completa",
    });
  } finally {
    demoSeedRunning = false;
  }
};
