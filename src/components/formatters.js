// components/formatters.js

// Base INR formatter
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format number as Indian Rupee currency
 * @param {number} value - The number to format
 * @param {Object} options
 * @param {boolean} [options.showColor] - Whether to color code positive/negative values
 * @param {boolean} [options.showArrow] - Whether to show up/down arrows
 * @returns {JSX.Element|string} - Formatted string or React JSX if color/arrow applied
 */
export function formatINR(value, { showColor = false, showArrow = false } = {}) {
  if (value === null || value === undefined || isNaN(value)) return "₹0.00";

  const formatted = inrFormatter.format(value);
  const isPositive = value > 0;
  const isNegative = value < 0;

  if (!showColor && !showArrow) return formatted;

  let color = "inherit";
  let arrow = "";

  if (showColor || showArrow) {
    if (isPositive) {
      color = "green";
      arrow = showArrow ? "▲" : "";
    } else if (isNegative) {
      color = "red";
      arrow = showArrow ? "▼" : "";
    }
  }

  return (
    <span style={{ color, fontWeight: 500 }}>
      {formatted} {arrow}
    </span>
  );
}
