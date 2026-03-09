export const mobileBottomNavHeightVar = "--private-mobile-bottom-nav-height";
export const mobileBottomNavOffsetVar = "--private-mobile-bottom-nav-offset";

export const mobileBottomNavOffset = `var(${mobileBottomNavOffsetVar})`;
export const mobileBottomFabOffset = `calc(${mobileBottomNavOffset} + 1rem)`;

export const mobileBottomNavHeightClassName =
  "min-h-[var(--private-mobile-bottom-nav-height)]";
export const mobileOffsetClassName =
  "pb-[var(--private-mobile-bottom-nav-offset)] lg:pb-0";
export const mobileStickyOffsetClassName =
  "bottom-[var(--private-mobile-bottom-nav-offset)]";
export const mobileFabOffsetClassName =
  "bottom-[calc(var(--private-mobile-bottom-nav-offset)+1rem)]";
