/**
 * Single source of truth for command -> vJoy button number, plus a
 * human-readable label per command for display purposes (Settings page).
 * Lives in shared/ (not server/services/vjoy.ts) specifically so client
 * code can import the map/labels directly without pulling in vjoy.ts's own
 * top-level import of the native `vjoy` module — that would break in the
 * browser, since native Node addons can't run there at all.
 */

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
  window_left_up: 21,
  window_left_down: 22,
  window_right_up: 23,
  window_right_down: 24,
  suspension_front_up: 25,
  suspension_front_down: 26,
  suspension_rear_up: 27,
  suspension_rear_down: 28,
  suspension_reset: 29,
  toggle_parking_brake: 30,
  cycle_wipers: 31,
  toggle_indicator_left: 32,
  toggle_indicator_right: 33,
  toggle_hazard_lights: 34,
  trailer_suspension_up: 35,
  trailer_suspension_down: 36,
  toggle_trailer_attach: 37,
  toggle_engine_brake: 38,
};

/** Display labels matching the button text in control-panel.tsx, for the Settings page reference table. */
export const commandLabels: Record<string, string> = {
  toggle_engine: "Engine",
  toggle_electric: "Electrical",
  toggle_lights_parking: "Light Modes",
  toggle_lights_beam_high: "High Beam",
  toggle_lights_beacon: "Beacon Lights",
  horn_short: "Horn",
  horn_long: "Long Horn",
  toggle_cruise_control: "Cruise Control",
  toggle_differential_lock: "Differential Lock",
  toggle_lift_axle: "Lift Axle",
  toggle_trailer_lift_axle: "Trailer Lift Axle",
  shift_up: "Shift Up",
  shift_down: "Shift Down",
  retarder_increase: "Retarder +",
  retarder_decrease: "Retarder -",
  window_left_up: "Left Window Up",
  window_left_down: "Left Window Down",
  window_right_up: "Right Window Up",
  window_right_down: "Right Window Down",
  suspension_front_up: "Front Suspension Raise",
  suspension_front_down: "Front Suspension Lower",
  suspension_rear_up: "Rear Suspension Raise",
  suspension_rear_down: "Rear Suspension Lower",
  suspension_reset: "Reset Suspension",
  toggle_parking_brake: "Parking Brake",
  cycle_wipers: "Wipers",
  toggle_indicator_left: "Left Turn",
  toggle_indicator_right: "Right Turn",
  toggle_hazard_lights: "Hazard Lights",
  trailer_suspension_up: "Trailer Suspension Raise",
  trailer_suspension_down: "Trailer Suspension Lower",
  toggle_trailer_attach: "Trailer Attach / Detach",
  toggle_engine_brake: "Engine Brake",
};
