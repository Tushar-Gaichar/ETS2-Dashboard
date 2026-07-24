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
 * An earlier version of this file also parsed controls.sii to try to show
 * which in-game action was bound to which button, as a reference display on
 * the Settings page. That parsing was never verified against a real
 * controls.sii containing joystick binds and was removed — the Settings
 * page now just shows this app's own OWN command -> vJoy button mapping
 * directly (see shared/vjoy-buttons.ts), which is simpler and always
 * correct by construction rather than a best-effort guess at a file format.
 */

export async function sendControlCommand(command: string): Promise<void> {
  await sendVjoyCommand(command);
}