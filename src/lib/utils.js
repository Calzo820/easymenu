// Helper functions used across multiple pages for common utilities.
// Centralizing these functions reduces code duplication and makes maintenance easier.
// Additional helpers can be added here as the project evolves.

/**
 * Calculate the difference in minutes between the current time and a timestamp.
 * Returns 0 for falsy or invalid input.
 *
 * @param {string|number|Date} timestamp The timestamp to compare against now.
 * @returns {number} The number of minutes elapsed, floored to an integer.
 */
export function differenzaMinuti(timestamp) {
  if (!timestamp) return 0;
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 60000));
}

/**
 * Format a timestamp into an Italian locale time string (HH:MM).
 * If the timestamp is falsy or invalid, returns a hyphen.
 *
 * @param {string|number|Date} timestamp The value to format.
 * @returns {string} A formatted time string or "-".
 */
export function formatoOra(timestamp) {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Build a pill-style button style object based on active state.
 * Extracted here to avoid recreating style objects on every render.
 *
 * @param {boolean} active Whether the button is in an active state.
 * @returns {Object} An inline style object for a pill button.
 */
export function pillButtonStyle(active) {
  /*
   * Render a pill-style button. The sizing here follows mobile/touch guidelines: 
   * touch targets should be at least 1 cm (≈40 px) tall and wide for reliable
   * selection【549256552326334†L96-L109】. A minimum height ensures the
   * button is comfortably tappable on tablets and smartphones. Padding is
   * increased for additional hit area. Colour contrast is preserved via the
   * dark/light backgrounds; callers should ensure text colour contrasts with
   * the background per WCAG recommendations【430100950336005†L40-L46】.  
   */
  return {
    border: 'none',
    borderRadius: 999,
    // increase padding to create a minimum interactive area ~40px tall
    padding: '12px 18px',
    minHeight: '40px',
    background: active ? '#111827' : '#e5e7eb',
    color: active ? 'white' : '#111827',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: 13,
  };
}