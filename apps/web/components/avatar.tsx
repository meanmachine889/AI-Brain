"use client";

import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { initials, lorelei } from "@dicebear/collection";
import { cn } from "@/lib/utils";

// DiceBear avatars, generated locally and deterministically from a seed —
// no network, same face every render. Clients get initials tiles; people
// (members/users) get lorelei portraits.

export function ClientAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const uri = useMemo(
    () =>
      createAvatar(initials, {
        seed: name,
        fontFamily: ["Inter", "sans-serif"],
        fontWeight: 400,
        fontSize: 38,
        radius: 15, // gentle corners baked into the SVG (not square, not pill)
      }).toDataUri(),
    [name],
  );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={uri}
      alt={name}
      draggable={false}
      className={cn("select-none rounded-[inherit]", className)}
    />
  );
}

export function PersonAvatar({
  seed,
  alt = "",
  className,
}: {
  seed: string;
  alt?: string;
  className?: string;
}) {
  const uri = useMemo(
    () => createAvatar(lorelei, { seed }).toDataUri(),
    [seed],
  );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={uri}
      alt={alt}
      draggable={false}
      className={cn("select-none rounded-full bg-muted", className)}
    />
  );
}
