import { promisify } from 'util';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execFileAsync = promisify(execFile);

// A key combo is a set of keys pressed together (e.g., ['SHIFT','H']).
// A sequence is one or more combos pressed in order.
export type KeyCombo = string[];
export type KeySequence = KeyCombo[];

// Default mapping using common ETS2 keybinds
const defaultSequenceMap: Record<string, KeySequence> = {
  toggle_engine: [[['E']].flat()],
  toggle_electric: [[['SHIFT', 'E']].flat()],
  toggle_lights_parking: [[['VK_F2']].flat()],
  toggle_lights_beam_low: [[['VK_F3']].flat()],
  toggle_lights_beam_high: [[['VK_F4']].flat()],
  toggle_lights_beacon: [[['VK_F5']].flat()],
  toggle_lights_aux_front: [[['VK_F6']].flat()],
  toggle_lights_aux_roof: [[['VK_F7']].flat()],
  horn_short: [[['H']].flat()],
  horn_long: [[['SHIFT', 'H']].flat()],
  toggle_cruise_control: [[['C']].flat()],
  toggle_retarder: [[['R']].flat()],
  toggle_differential_lock: [[['D']].flat()],
  toggle_lift_axle: [[['L']].flat()],
  toggle_trailer_lift_axle: [[['SHIFT', 'L']].flat()],
  shift_up: [[['VK_UP']].flat()],
  shift_down: [[['VK_DOWN']].flat()],
  toggle_range_splitter: [[['S']].flat()],
};

let overridesLoaded = false;
let overridesMap: Partial<Record<string, KeySequence>> = {};

// Attempt to parse ETS2 controls.sii and derive overrides
function tryLoadControlsOverrides(): void {
  if (overridesLoaded) return;
  overridesLoaded = true;

  try {
    const docs = path.join(os.homedir(), 'Documents', 'Euro Truck Simulator 2', 'profiles');
    if (!fs.existsSync(docs)) return;
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
    if (!latestFile) return;
    const text = fs.readFileSync(latestFile, 'utf8');
    overridesMap = parseControlsSii(text);
  } catch {
    // ignore errors and use defaults
  }
}

// Very forgiving parser for controls.sii-like lines embedded in config_lines strings.
// Looks for strings like: "mix something `keyboard.f3`" or "`keyboard.lshift + keyboard.h`"
function parseControlsSii(contents: string): Partial<Record<string, KeySequence>> {
  const result: Partial<Record<string, KeySequence>> = {};
  const lines = contents.split(/\r?\n/);

  // map heuristics from action tokens to our commands
  const actionToCommand: Array<[RegExp, string]> = [
    [/engine.*(toggle|start|stop)/i, 'toggle_engine'],
    [/(electric|electrical)/i, 'toggle_electric'],
    [/parking.*light/i, 'toggle_lights_parking'],
    [/(low.*beam|beam.*low)/i, 'toggle_lights_beam_low'],
    [/(high.*beam|beam.*high)/i, 'toggle_lights_beam_high'],
    [/beacon/i, 'toggle_lights_beacon'],
    [/(aux.*front|front.*aux)/i, 'toggle_lights_aux_front'],
    [/(aux.*roof|roof.*aux)/i, 'toggle_lights_aux_roof'],
    [/(air.*horn|long.*horn)/i, 'horn_long'],
    [/\bhorn\b/i, 'horn_short'],
    [/cruise.*control/i, 'toggle_cruise_control'],
    [/retarder/i, 'toggle_retarder'],
    [/(diff.*lock|differential)/i, 'toggle_differential_lock'],
    [/(lift.*trailer.*axle)/i, 'toggle_trailer_lift_axle'],
    [/(lift.*axle)/i, 'toggle_lift_axle'],
    [/(shift.*up|gear.*up)/i, 'shift_up'],
    [/(shift.*down|gear.*down)/i, 'shift_down'],
    [/(range.*split)/i, 'toggle_range_splitter'],
  ];

  const extractKeys = (expr: string): KeySequence | null => {
    // expr examples: "keyboard.f3", "keyboard.lshift + keyboard.h", "keyboard.up"
    const parts = expr
      .split(/\+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/`/g, ''));

    const combo: string[] = [];
    for (const p of parts) {
      const m = /keyboard\.(.+)/i.exec(p) || /key\.(.+)/i.exec(p) || /(.+)/.exec(p);
      const token = (m?.[1] || p).toLowerCase();
      const t = token
        .replace(/\?.*$/, '') // strip trailing ?0
        .replace(/\s+/g, '');
      const mapped = mapTokenToVkName(t);
      if (!mapped) return null;
      combo.push(mapped);
    }
    if (combo.length === 0) return null;
    return [combo];
  };

  for (const line of lines) {
    const m = /\"mix\s+([^\"]+)\s+`([^`]+)`\"/i.exec(line);
    if (!m) continue;
    const action = m[1].toLowerCase();
    const expr = m[2];
    for (const [re, cmd] of actionToCommand) {
      if (re.test(action)) {
        const seq = extractKeys(expr);
        if (seq) result[cmd] = seq;
        break;
      }
    }
  }

  return result;
}

function mapTokenToVkName(token: string): string | null {
  const t = token.toLowerCase();
  if (t.length === 1 && /[a-z0-9]/.test(t)) return t.toUpperCase();
  const map: Record<string, string> = {
    up: 'VK_UP',
    down: 'VK_DOWN',
    left: 'VK_LEFT',
    right: 'VK_RIGHT',
    lshift: 'SHIFT',
    rshift: 'SHIFT',
    shift: 'SHIFT',
    lcontrol: 'CTRL',
    rcontrol: 'CTRL',
    control: 'CTRL',
    lalt: 'ALT',
    ralt: 'ALT',
    alt: 'ALT',
    f1: 'VK_F1', f2: 'VK_F2', f3: 'VK_F3', f4: 'VK_F4', f5: 'VK_F5', f6: 'VK_F6', f7: 'VK_F7', f8: 'VK_F8',
    f9: 'VK_F9', f10: 'VK_F10', f11: 'VK_F11', f12: 'VK_F12',
  };
  return map[t] || null;
}

export function getSendKeysForCommand(command: string): KeySequence | undefined {
  tryLoadControlsOverrides();
  return overridesMap[command] || defaultSequenceMap[command];
}

// Load overrides from raw controls.sii content provided by the client
export function loadControlsOverridesFromText(text: string): number {
  try {
    const parsed = parseControlsSii(text);
    overridesMap = parsed;
    overridesLoaded = true;
    return Object.keys(parsed).length;
  } catch {
    return 0;
  }
}

// Sends input to ETS2 using Windows SendInput via PowerShell (P/Invoke). Windows-only.
export async function sendKeysToEts2(sequence: KeySequence): Promise<void> {
  if (process.platform !== 'win32') {
    throw new Error('Sending controls is only supported on Windows in this build.');
  }

  if (!sequence || sequence.length === 0) {
    throw new Error('Empty key sequence');
  }

  // Optional fallback: use classic WScript.Shell SendKeys
  if (process.env.ETS2_USE_SENDKEYS === '1') {
    await sendKeysViaWScript(sequence);
    return;
  }

  // Build PowerShell script with C# P/Invoke to SendInput
  const vkMap: Record<string, number> = {
    // Letters and digits
    ...Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, 0x41 + i])),
    ...Object.fromEntries('0123456789'.split('').map((c, i) => [c, 0x30 + i])),
    // Modifiers
    SHIFT: 0x10, CTRL: 0x11, ALT: 0x12,
    // Function keys
    VK_F1: 0x70, VK_F2: 0x71, VK_F3: 0x72, VK_F4: 0x73, VK_F5: 0x74, VK_F6: 0x75, VK_F7: 0x76, VK_F8: 0x77,
    VK_F9: 0x78, VK_F10: 0x79, VK_F11: 0x7A, VK_F12: 0x7B,
    // Arrows
    VK_UP: 0x26, VK_DOWN: 0x28, VK_LEFT: 0x25, VK_RIGHT: 0x27,
  };

  const seqLiteral = JSON.stringify(sequence);
  const windowTitle = process.env.ETS2_WINDOW_TITLE || 'Euro Truck Simulator 2';

  const ps = `
$ErrorActionPreference = 'Stop'
$wshell = New-Object -ComObject WScript.Shell
$null = $wshell.AppActivate('${windowTitle.replace(/'/g, "''")}')
Start-Sleep -Milliseconds 100

$code = @"
using System;
using System.Runtime.InteropServices;
public static class InputSender {
  [StructLayout(LayoutKind.Sequential)]
  struct INPUT { public uint type; public InputUnion U; }
  [StructLayout(LayoutKind.Explicit)]
  struct InputUnion { [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)]
  struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public UIntPtr dwExtraInfo; }
  const uint INPUT_KEYBOARD = 1;
  const uint KEYEVENTF_KEYUP = 0x0002;
  const uint KEYEVENTF_SCANCODE = 0x0008;
  const uint KEYEVENTF_UNICODE = 0x0004;
  [DllImport("user32.dll", SetLastError=true)]
  static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
  [DllImport("user32.dll", SetLastError=true)]
  static extern uint MapVirtualKey(uint uCode, uint uMapType);
  public static void KeyDownVk(ushort vk){ ushort sc = (ushort)MapVirtualKey(vk, 0); KeyDownScan(sc); }
  public static void KeyUpVk(ushort vk){ ushort sc = (ushort)MapVirtualKey(vk, 0); KeyUpScan(sc); }
  public static void KeyDownScan(ushort sc){ INPUT[] input = new INPUT[1]; input[0].type = INPUT_KEYBOARD; input[0].U.ki.wVk = 0; input[0].U.ki.wScan = sc; input[0].U.ki.dwFlags = KEYEVENTF_SCANCODE; input[0].U.ki.time = 0; input[0].U.ki.dwExtraInfo = UIntPtr.Zero; SendInput(1, input, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT))); }
  public static void KeyUpScan(ushort sc){ INPUT[] input = new INPUT[1]; input[0].type = INPUT_KEYBOARD; input[0].U.ki.wVk = 0; input[0].U.ki.wScan = sc; input[0].U.ki.dwFlags = KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP; input[0].U.ki.time = 0; input[0].U.ki.dwExtraInfo = UIntPtr.Zero; SendInput(1, input, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT))); }
  public static void SendUnicodeChar(ushort ch){ INPUT[] d = new INPUT[1]; d[0].type = INPUT_KEYBOARD; d[0].U.ki.wVk = 0; d[0].U.ki.wScan = ch; d[0].U.ki.dwFlags = KEYEVENTF_UNICODE; d[0].U.ki.time = 0; d[0].U.ki.dwExtraInfo = UIntPtr.Zero; SendInput(1, d, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT))); INPUT[] u = new INPUT[1]; u[0].type = INPUT_KEYBOARD; u[0].U.ki.wVk = 0; u[0].U.ki.wScan = ch; u[0].U.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP; u[0].U.ki.time = 0; u[0].U.ki.dwExtraInfo = UIntPtr.Zero; SendInput(1, u, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT))); }
}
"@

Add-Type -TypeDefinition $code -Language CSharp

$vk = @{}
${Object.keys(vkMap).map(k => `$vk['${k}'] = ${vkMap[k]};`).join('\n')}

$json = @'
${seqLiteral}
'@
$sequence = $json | ConvertFrom-Json

# Ensure target window is active just before sending input
$null = $wshell.AppActivate('${windowTitle.replace(/'/g, "''")}')
Start-Sleep -Milliseconds 60

foreach ($combo in $sequence) {
  $modsList = @('SHIFT','CTRL','ALT')
  $mods = @()
  foreach ($k in $combo) { if ($modsList -contains $k) { $mods += $k } }

  # Press modifiers first
  foreach ($m in $mods) { [InputSender]::KeyDownVk([uint16]$vk[$m]) }

  $others = @()
  foreach ($k in $combo) { if (-not ($modsList -contains $k)) { $others += $k } }

  foreach ($key in $others) {
    if ($key -match '^[A-Z0-9]$' -and $mods.Count -eq 0) {
      # Use Unicode typing for plain characters so text apps show input
      [InputSender]::SendUnicodeChar([uint16][char]$key)
    } elseif ($vk.ContainsKey($key)) {
      [InputSender]::KeyDownVk([uint16]$vk[$key])
      Start-Sleep -Milliseconds 20
      [InputSender]::KeyUpVk([uint16]$vk[$key])
    }
  }

  # Release modifiers in reverse order
  for (($i = $mods.Count - 1); $i -ge 0; $i--) { [InputSender]::KeyUpVk([uint16]$vk[$mods[$i]]) }
  Start-Sleep -Milliseconds 30
}
`;

  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy', 'Bypass',
    '-Command', ps,
  ], { windowsHide: true });
}

function tokenToSendKeys(t: string): string | null {
  // Modifiers are handled separately
  if (t === 'VK_UP') return '{UP}';
  if (t === 'VK_DOWN') return '{DOWN}';
  if (t === 'VK_LEFT') return '{LEFT}';
  if (t === 'VK_RIGHT') return '{RIGHT}';
  const fMatch = /^VK_F(\d+)$/.exec(t);
  if (fMatch) return `{F${fMatch[1]}}`;
  if (/^[A-Z0-9]$/.test(t)) return t; // letters/digits
  return null;
}

async function sendKeysViaWScript(sequence: KeySequence): Promise<void> {
  const windowTitle = process.env.ETS2_WINDOW_TITLE || 'Euro Truck Simulator 2';

  // Build SendKeys string
  const parts: string[] = [];
  for (const combo of sequence) {
    const mods = new Set(combo.filter(k => k === 'SHIFT' || k === 'CTRL' || k === 'ALT'));
    const others = combo.filter(k => !(k === 'SHIFT' || k === 'CTRL' || k === 'ALT'));
    const modPrefix = `${mods.has('SHIFT') ? '+' : ''}${mods.has('CTRL') ? '^' : ''}${mods.has('ALT') ? '%' : ''}`;
    if (others.length <= 1) {
      const token = others[0] ? tokenToSendKeys(others[0]) : '';
      parts.push(modPrefix + (token ?? ''));
    } else {
      const inner = others.map(k => tokenToSendKeys(k) ?? '').join('');
      parts.push(modPrefix + `(${inner})`);
    }
  }
  const sendStr = parts.join(' ');

  const ps = `
$ErrorActionPreference = 'Stop'
$wshell = New-Object -ComObject WScript.Shell
$null = $wshell.AppActivate('${windowTitle.replace(/'/g, "''")}')
Start-Sleep -Milliseconds 150
$s = @'
${sendStr}
'@
$wshell.SendKeys($s)
`;

  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy', 'Bypass',
    '-Command', ps,
  ], { windowsHide: true });
}
