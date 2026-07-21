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

interface ScalarCheckResult {
  found: boolean;
  alreadyCorrect: boolean;
  previousValue?: string;
  content: string;
}

/**
 * Confirmed against a real controls.sii (not a guess anymore): these two
 * values live as quoted strings inside a config_lines[] array, like:
 *   config_lines[37]: "constant c_mousesteer 1.000000"
 *   config_lines[40]: "constant c_relatsteer 1.000000"
 * Checks the CURRENT value against the target first — only actually
 * rewrites the line if it's different, so a file that's already correct
 * comes back unchanged (and says so) instead of being blindly overwritten
 * every time.
 */
function checkAndReplaceScalarValue(content: string, key: string, targetValue: string): ScalarCheckResult {
  const re = new RegExp(`("constant\\s+${key}\\s+)([\\d.]+)(")`, 'i');
  const match = re.exec(content);
  if (!match) {
    return { found: false, alreadyCorrect: false, content };
  }

  const previousValue = match[2]!;
  if (parseFloat(previousValue) === parseFloat(targetValue)) {
    return { found: true, alreadyCorrect: true, previousValue, content };
  }

  const updated = content.replace(re, (_m, prefix, _old, suffix) => `${prefix}${targetValue}${suffix}`);
  return { found: true, alreadyCorrect: false, previousValue, content: updated };
}

export function editMouseSteerInControlsSii(originalContent: string): MouseSteerEditResult {
  if (!originalContent || typeof originalContent !== 'string') {
    return { success: false, message: 'No controls.sii content received.' };
  }

  let content = originalContent;

  const mouseSteer = checkAndReplaceScalarValue(content, 'c_mousesteer', '1.000000');
  content = mouseSteer.content;
  const relatSteer = checkAndReplaceScalarValue(content, 'c_relatsteer', '0.000000');
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
  const describe = (name: string, r: ScalarCheckResult) =>
    !r.found ? `${name} not found` : r.alreadyCorrect ? `${name} already correct` : `${name} corrected (was ${r.previousValue})`;

  const bothAlreadyCorrect = mouseSteer.alreadyCorrect && relatSteer.alreadyCorrect;
  const summary = `${describe('c_mousesteer', mouseSteer)}; ${describe('c_relatsteer', relatSteer)}`;

  if (missing.length > 0) {
    return {
      success: true,
      message: `${summary}. Couldn't find ${missing.join(' or ')} in this file — double check the result before using it.`,
      updatedContent: content,
    };
  }

  if (bothAlreadyCorrect) {
    return {
      success: true,
      message: `Already set correctly — no changes needed. (${summary})`,
      updatedContent: content,
    };
  }

  return {
    success: true,
    message: `${summary}. Download the file below, close ETS2 if it isn't already, and replace your profile's controls.sii with this one.`,
    updatedContent: content,
  };
}