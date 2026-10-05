import Image from "next/image";

export default function BrandLogo({
  size = 32,
  priority = false,
  decorative = false,
}: {
  size?: number;
  priority?: boolean;
  decorative?: boolean;
}) {
  return (
    <Image
      src="/brand/coopera-pro-logo.png"
      alt={decorative ? "" : "Coopera Pro"}
      aria-hidden={decorative || undefined}
      width={size}
      height={size}
      priority={priority}
      className="shrink-0"
    />
  );
}
