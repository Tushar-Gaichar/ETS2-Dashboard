import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { sendVjoyCommand } from './vjoy';

/**
 * vJoy is now the ONLY way commands reach the game. The earlier SendInput
 * (raw Win32 keyboard injection via PowerShell/C#) and SendKeys
 * (WScript.Shell) paths were removed entirely — they turned out to be too
 * unreliable in practice (window focus stealing, DirectInput games not
 * reliably seeing injected key events, etc.), and vJoy — a real virtual
 * joystick device that ETS2 reads exactly like a physical button box — is
 * what actually works.
 *
 * Because of that, controls.sii is no longer used to figure out which KEYS
 * to simulate (there's nothing left that simulates keys). Its role now is
 * purely informational: parse it so the Settings page can show the player
 * a reference table of which in-game action is bound to which button, so
 * they can confirm their own ETS2 control bindings line up with the vJoy
 * button numbers this app presses (see defaultVjoyButtonMap in vjoy.ts).
 */

export interface ParsedBinding {
  /** The in-game action token as it appears in controls.sii, e.g. "truck_horn". */
  action: string;
  /** The raw binding expression from controls.sii, shown as-is when we can't confidently parse it further. */
  raw: string;
  /** Best-effort extraction, only set when the expression looks like a joystick/device binding. */
  device?: string;
  button?: number;
}

let lastParsedBindings: ParsedBinding[] = [];
let lastParsedSource: string | null = null;

/**
 * Very forgiving parser for controls.sii lines shaped like:
 *   "mix truck_horn `keyboard.h`"
 *   "mix truck_horn `joy1.button2`"
 * The exact device-token format ETS2 uses for joystick bindings (vs the
 * keyboard.* format, which is confirmed working) hasn't been verified
 * against a real controls.sii containing joystick binds — if the button
 * numbers don't show up right, share a sample line from your actual file
 * and this regex can be corrected against real data instead of a guess.
 */
function parseControlsSii(contents: string): ParsedBinding[] {
  const results: ParsedBinding[] = [];
  const lines = contents.split(/\r?\n/);

  // Recognizes tokens like "joy1.button2", "joy1button2", "js0.btn3" —
  // deliberately loose since the exact format isn't verified yet.
  const joyPattern = /\b(joy|js)(\d+)[.\s]*b(?:utton|tn)?(\d+)\b/i;

  for (const line of lines) {
    const m = /"mix\s+([^\s`]+)\s+`([^`]+)`"/i.exec(line);
    if (!m) continue;
    const action = m[1]!;
    const expr = m[2]!.replace(/`/g, '').trim();

    const joyMatch = joyPattern.exec(expr);
    if (joyMatch) {
      results.push({
        action,
        raw: expr,
        device: `${joyMatch[1]}${joyMatch[2]}`,
        button: parseInt(joyMatch[3]!, 10),
      });
    } else {
      results.push({ action, raw: expr });
    }
  }

  return results;
}

function findLatestControlsSii(): string | null {
  try {
    const docs = path.join(os.homedir(), 'Documents', 'Euro Truck Simulator 2', 'profiles');
    if (!fs.existsSync(docs)) return null;
    const profileDirs = fs.readdirSync(docs)
      .map((d) => path.join(docs, d))
      .filter((p) => fs.statSync(p).isDirectory());
    let latestFile: string | null = null;
    let latestMtime = 0;
    for (const dir of profileDirs) {
      const f = path.join(dir, 'controls.sii');
      if (fs.existsSync(f)) {
        const m = fs.statSync(f).mtimeMs;
        if (m > latestMtime) { latestMtime = m; latestFile = f; }
      }
    }
    return latestFile;
  } catch {
    return null;
  }
}

/** Auto-detects the most recently modified profile's controls.sii, if any. */
export function autoLoadControlBindings(): ParsedBinding[] {
  if (lastParsedSource === 'auto') return lastParsedBindings;
  const file = findLatestControlsSii();
  if (!file) return [];
  try {
    const text = fs.readFileSync(file, 'utf8');
    lastParsedBindings = parseControlsSii(text);
    lastParsedSource = 'auto';
    return lastParsedBindings;
  } catch {
    return [];
  }
}

/** Loads bindings from raw controls.sii content uploaded by the client. */
export function loadControlsOverridesFromText(text: string): ParsedBinding[] {
  lastParsedBindings = parseControlsSii(text);
  lastParsedSource = 'upload';
  return lastParsedBindings;
}

export function getLastParsedBindings(): ParsedBinding[] {
  return lastParsedBindings;
}

// --- Unified entry point — vJoy only. ---
export async function sendControlCommand(command: string): Promise<void> {
  await sendVjoyCommand(command);
}