// Sends control commands to ETS2 via a vJoy virtual joystick device instead
// of synthetic keyboard input. This sidesteps the whole class of problems we
// hit with SendInput/AppActivate (window-focus stealing being silently
// blocked by Windows, wrong-window matches, etc): vJoy is a real driver-level
// HID device, so ETS2 reads its button state the exact same way it would
// read a physical button box or wheel - no window focus or foreground
// stealing involved at all.
//
// Setup required once per PC:
//   1. Install/enable the vJoy driver and, in "Configure vJoy", enable a
//      device with at least as many buttons as the highest number used in
//      defaultVjoyButtonMap below (18 today; the example device used during
//      development had 32, which leaves headroom).
//   2. In ETS2: Options -> Controls -> bind each in-game action (engine,
//      lights, horn, etc.) to the matching vJoy button number, exactly like
//      binding a physical joystick button.
//   3. Set ETS2_INPUT_METHOD=vjoy (this is the default) and, if your vJoy
//      device number isn't 1, set ETS2_VJOY_DEVICE_ID to match.
//
// A controls.sii-driven setup helper (to auto-detect/write these bindings
// for the user) is planned but not implemented yet - for now the button
// mapping below is static and must be bound manually in-game.

// Fallback device number used when ETS2_VJOY_DEVICE_ID isn't set. Change
// this if your vJoy device number differs and you don't want to rely on the
// env var.
const DEFAULT_VJOY_DEVICE_ID = 3;

type VjoyButton = { set(pressed: boolean): void; get(): boolean };

type VjoyDeviceInstance = {
  initialize(): boolean;
  updateInputs(): void;
  free(): void;
  buttons: Record<number, VjoyButton>;
};

type VjoyModule = {
  vJoy: {
    isEnabled(): boolean;
    maxDevices(): number;
    existingDevices(): number;
  };
  vJoyDevice: {
    create(id: number): VjoyDeviceInstance;
  };
};

let vjoyModulePromise: Promise<VjoyModule> | null = null;

async function loadVjoy(): Promise<VjoyModule> {
  if (process.platform !== 'win32') {
    throw new Error('vJoy is only supported on Windows in this build.');
  }
  if (!vjoyModulePromise) {
    vjoyModulePromise = import('vjoy')
      .then((m: any) => {
        // Node's ESM import of a CommonJS module tries to statically detect
        // named exports (via cjs-module-lexer). For native addons like this
        // one, that detection can be incomplete or asymmetric - in testing
        // it picked up `vJoy` but left `vJoyDevice` undefined even though
        // both are genuinely exported by the package. `m.default` always
        // holds the full, real `module.exports` object regardless of what
        // the named-export detection caught, so prefer that and only fall
        // back to the named exports if `default` isn't present.
        const source = m?.default && (m.default.vJoy || m.default.vJoyDevice) ? m.default : m;
        const vJoy = source?.vJoy;
        const vJoyDevice = source?.vJoyDevice;
        if (!vJoy || !vJoyDevice) {
          throw new Error(
            'the "vjoy" module loaded but did not expose vJoy/vJoyDevice as expected - ' +
            'it may be an incompatible version'
          );
        }
        return { vJoy, vJoyDevice } as VjoyModule;
      })
      .catch((err) => {
        // Allow retrying on the next command (e.g. after the user installs
        // the package or the vJoy driver) instead of caching the failure.
        vjoyModulePromise = null;
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(
          `Could not load the "vjoy" Node module (${reason}). Run "npm install" ` +
          `on the machine running the server (Windows Build Tools required to ` +
          `compile its native addon), and make sure the vJoy driver itself is installed.`
        );
      });
  }
  return vjoyModulePromise;
}

let device: VjoyDeviceInstance | null = null;

function getDeviceId(): number {
  const raw = process.env.ETS2_VJOY_DEVICE_ID;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_VJOY_DEVICE_ID;
}

async function ensureDevice(): Promise<VjoyDeviceInstance> {
  if (device) return device;

  const { vJoy, vJoyDevice } = await loadVjoy();

  if (!vJoy.isEnabled()) {
    throw new Error(
      'vJoy driver is not enabled. Open "Configure vJoy" and make sure it shows ' +
      'as enabled with at least one device configured.'
    );
  }

  const id = getDeviceId();
  const dev = vJoyDevice.create(id);
  if (!dev) {
    throw new Error(
      `Could not create/acquire vJoy device ${id}. It may already be held by ` +
      `another application (close SimHub or anything else using it), the ` +
      `device isn't enabled in "Configure vJoy", or it doesn't exist. Set ` +
      `ETS2_VJOY_DEVICE_ID to target a different device number if needed.`
    );
  }
  // create() already initializes internally per the vJoy SDK docs, but call
  // initialize() defensively too in case a given version returns an
  // unacquired instance instead - safe to call again either way.
  const acquired = typeof dev.initialize === 'function' ? dev.initialize() : true;
  if (!acquired) {
    throw new Error(
      `Could not acquire vJoy device ${id}. It may already be held by another ` +
      `application (close SimHub or anything else using it), or that device ` +
      `isn't enabled in "Configure vJoy". Set ETS2_VJOY_DEVICE_ID to target a ` +
      `different device number if needed.`
    );
  }
  dev.updateInputs();
  device = dev;
  console.log(`[ets2-controls] Acquired vJoy device ${id}`);
  return dev;
}

// command -> vJoy button number. Bind each of these to the matching in-game
// action under ETS2's Options -> Controls, the same way you'd bind a real
// button box. Numbers 19+ are left free on a 32-button device for future use.
export const defaultVjoyButtonMap: Record<string, number> = {
  toggle_engine: 1,
  toggle_electric: 2,
  toggle_lights_parking: 3, // cycles the game's actual light modes (off/parking/low beam) — the only light-mode key ETS2 exposes
  toggle_lights_beam_high: 5,
  toggle_lights_beacon: 6,
  horn_short: 9,
  horn_long: 10,
  toggle_cruise_control: 11,
  toggle_differential_lock: 13,
  toggle_lift_axle: 14,
  toggle_trailer_lift_axle: 15,
  shift_up: 16,
  shift_down: 17,
  retarder_increase: 19,
  retarder_decrease: 20,
};

export function getVjoyButtonForCommand(command: string): number | undefined {
  return defaultVjoyButtonMap[command];
}

// How long to hold the virtual button down before releasing. ETS2 reads a
// vJoy bind as a simple press/release, same as a keyboard key, so a short
// pulse is enough for toggles - mirrors the key-down/key-up timing used for
// SendInput.
const PRESS_HOLD_MS = 60;

// A real horn press/tap is noticeably longer than a toggle pulse - a 60ms
// blip barely registers as a horn honk in-game. Override just for the horn
// commands; every other command keeps the brief PRESS_HOLD_MS.
const PRESS_HOLD_OVERRIDES_MS: Partial<Record<string, number>> = {
  horn_short: 150,
  horn_long: 400,
};

function getPressHoldMs(command?: string): number {
  if (command && PRESS_HOLD_OVERRIDES_MS[command] !== undefined) {
    return PRESS_HOLD_OVERRIDES_MS[command]!;
  }
  return PRESS_HOLD_MS;
}

export async function pressVjoyButton(buttonNumber: number, command?: string): Promise<void> {
  const dev = await ensureDevice();
  const btn = dev.buttons[buttonNumber];
  if (!btn) {
    throw new Error(
      `vJoy device ${getDeviceId()} has no button ${buttonNumber} configured. ` +
      `Open "Configure vJoy" and set "Number of Buttons" to at least ${buttonNumber}.`
    );
  }
  btn.set(true);
  await new Promise((resolve) => setTimeout(resolve, getPressHoldMs(command)));
  btn.set(false);
}

export async function sendVjoyCommand(command: string): Promise<void> {
  const button = getVjoyButtonForCommand(command);
  if (button === undefined) {
    throw new Error(`No vJoy button mapping for command: ${command}`);
  }
  await pressVjoyButton(button, command);
}

// Release the device cleanly on shutdown so it can be reacquired by this
// server (or another application) on the next run - the SDK docs are
// explicit that free() must be called or no other process can acquire it.
function releaseDevice(): void {
  if (device) {
    try {
      device.free();
    } catch {
      // ignore - best-effort cleanup
    }
    device = null;
  }
}
process.on('exit', releaseDevice);
process.on('SIGINT', () => { releaseDevice(); process.exit(); });
process.on('SIGTERM', () => { releaseDevice(); process.exit(); });