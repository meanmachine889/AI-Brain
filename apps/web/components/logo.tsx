import Image from "next/image";

/**
 * The Neuron brand mark (public/logo.png). Square asset; size via `className`
 * (e.g. "size-7"). Used in the landing nav/footer and the auth surfaces.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Neuron"
      width={64}
      height={64}
      priority
      className={`rounded-[22%] object-contain ${className ?? ""}`}
    />
  );
}
