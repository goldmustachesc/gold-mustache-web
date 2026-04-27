import type React from "react";

interface Props {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: unknown;
}

export default function MockNextImage({
  src,
  alt,
  fill: _fill,
  priority: _priority,
  ...props
}: Props) {
  // biome-ignore lint/performance/noImgElement: mock stub for tests
  return <img src={typeof src === "string" ? src : ""} alt={alt} {...props} />;
}
