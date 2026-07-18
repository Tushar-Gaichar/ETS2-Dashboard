/**
 * Corrects an earlier wrong assumption: c_mousesteer / c_relatsteer live in
 * the PLAYER'S PROFILE's controls.sii, not in the global config.cfg. This
 * only edits text content handed to it — no filesystem access, no silent
 * writes to the player's actual game files. The workflow this supports:
 *
 *   1. Player disables Steam Cloud for their profile (in-game, at the
 *      profile screen) — otherwise Steam Cloud can overwrite this edit
 *      right back to the old value on next sync.
 *   2. Player closes ETS2 completely.
 *   3. Player finds their profile's controls.sii on disk and uploads it here.
 *   4. This edits the two values and hands back the modified file.
 *   5. Player manually replaces their real controls.sii with the edited one.
 *
 * Steps 1/2/3/5 are the player's responsibility — nothing here touches their
 * disk directly, on purpose.
 */

export interface MouseSteerEditResult {
  success: boolean;
  message: string;
  updatedContent?: string;
}

/**
 * Finds an existing "key: value;" (or "key: value" without a trailing
 * semicolon — SII formatting varies) assignment and replaces the value,
 * preserving whatever indentation/whitespace surrounds it. Doesn't attempt
 * to insert the key if it's missing — SII's block nesting means a blind
 * top-level append could land the key in the wrong block entirely, and
 * ETS2 writes these keys for every profile regardless of whether the
 * player customized them, so "missing entirely" would be unusual.
 */
function replaceScalarValue(content: string, key: string, value: string): { content: string; found: boolean } {
  const re = new RegExp(`(\\b${key}\\s*:\\s*)([^;\\r\\n]*)(;?)`, 'i');
  if (!re.test(content)) {
    return { content, found: false };
  }
  const updated = content.replace(re, (_match, prefix, _oldValue, semicolon) => `${prefix}${value}${semicolon}`);
  return { content: updated, found: true };
}

export function editMouseSteerInControlsSii(originalContent: string): MouseSteerEditResult {
  if (!originalContent || typeof originalContent !== 'string') {
    return { success: false, message: 'No controls.sii content received.' };
  }

  let content = originalContent;

  const mouseSteer = replaceScalarValue(content, 'c_mousesteer', '1.000000');
  content = mouseSteer.content;
  const relatSteer = replaceScalarValue(content, 'c_relatsteer', '0.000000');
  content = relatSteer.content;

  if (!mouseSteer.found && !relatSteer.found) {
    return {
      success: false,
      message:
        'Could not find c_mousesteer or c_relatsteer in this file — this hasn\'t been verified against a real ' +
        'controls.sii yet, so the exact key format may differ from what this expects. Share a snippet containing ' +
        'those two lines from your actual file so this can be corrected against real data.',
    };
  }

  const missing = [!mouseSteer.found && 'c_mousesteer', !relatSteer.found && 'c_relatsteer'].filter(Boolean);

  return {
    success: true,
    message:
      missing.length > 0
        ? `Updated ${mouseSteer.found ? 'c_mousesteer' : 'c_relatsteer'}, but couldn't find ${missing.join(' or ')} in this file — double check the result before using it.`
        : 'Both values updated. Download the file below, close ETS2 if it isn\'t already, and replace your profile\'s controls.sii with this one.',
    updatedContent: content,
  };
}