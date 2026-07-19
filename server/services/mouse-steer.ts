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
 * Confirmed against a real controls.sii (not a guess anymore): these two
 * values live as quoted strings inside a config_lines[] array, like:
 *   config_lines[37]: "constant c_mousesteer 1.000000"
 *   config_lines[40]: "constant c_relatsteer 1.000000"
 * Matches and replaces just the numeric value, preserving everything else
 * (the config_lines[N] index, quoting, line ending) exactly as-is.
 */
function replaceScalarValue(content: string, key: string, value: string): { content: string; found: boolean } {
  const re = new RegExp(`("constant\\s+${key}\\s+)([\\d.]+)(")`, 'i');
  if (!re.test(content)) {
    return { content, found: false };
  }
  const updated = content.replace(re, (_match, prefix, _oldValue, suffix) => `${prefix}${value}${suffix}`);
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
        'Could not find c_mousesteer or c_relatsteer in this file. The expected format is ' +
        '`config_lines[N]: "constant c_mousesteer VALUE"` (confirmed against a real controls.sii) — if your file ' +
        'looks different, share a snippet of the relevant lines so this can be corrected.',
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