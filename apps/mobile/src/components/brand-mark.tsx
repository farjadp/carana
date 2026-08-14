// ============================================================================
// Source: apps/mobile/src/components/brand-mark.tsx
// Version: 1.0.0 — 2026-08-24
// Why: The approved "Hidden Č" mark. Geometry matches the master pack exactly;
//      regenerate from charana-mark-primary.svg if that changes.
// ============================================================================
import Svg, { Path } from "react-native-svg";

import { colors } from "../theme";

/**
 * Below roughly 32pt the inner path muddies, so the brand book specifies a
 * simplified variant for small sizes — pass `simple`.
 */
export function BrandMark({
  size = 32,
  color = colors.annabi,
  simple = false,
}: {
  size?: number;
  color?: string;
  simple?: boolean;
}) {
  return (
    <Svg viewBox="0 0 1000 1000" width={size} height={size}>
      <Path
        fill={color}
        d="M760 190 C690 120 600 80 500 80 C268 80 80 268 80 500 C80 732 268 920 500 920
           C610 920 708 878 780 806 L666 692 C624 734 566 760 500 760 C356 760 240 644 240 500
           C240 356 356 240 500 240 C562 240 620 262 664 304 Z"
      />
      {simple ? null : (
        <>
          <Path
            fill={color}
            d="M364 548 C418 478 496 448 586 462 C652 472 704 508 748 560 L650 650
               C624 620 592 602 552 596 C496 588 448 608 416 650 Z"
          />
          <Path fill={color} d="M648 650 L790 650 L790 792 Z" />
        </>
      )}
      <Path fill={color} d="M438 318 L500 372 L562 318 L598 354 L500 442 L402 354 Z" />
    </Svg>
  );
}
