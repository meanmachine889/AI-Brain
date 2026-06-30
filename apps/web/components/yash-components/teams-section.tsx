"use client";

import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SquareLock02Icon,
  Tick02Icon,
  PencilEdit02Icon,
  ViewIcon,
  Add01Icon,
} from "@hugeicons/core-free-icons";

import { SectionFrame } from "@/components/yash-components/section-frame";

// ── Card graphics (hand-built, original — no AI/stock) ───────────────────────

// Card 1 — access. A soft warm panel: the owner at top (with a key badge), then
// a short list of client rows where two are granted and one is dimmed (no
// access). Flat, front-facing, one warm accent.
function AccessGraphic() {
  const rows = [
    { name: "Acme Co.", granted: true },
    { name: "Vela Studio", granted: true },
    { name: "Northwind", granted: false },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(150deg,#fdf3ec_0%,#fbe9df_100%)] p-6">
      <div className="w-full max-w-[260px] rounded-xl bg-white/80 p-3 shadow-soft ring-1 ring-black/[0.04] backdrop-blur">
        {/* Owner row */}
        <div className="flex items-center gap-2.5 rounded-lg bg-[#f59e6b]/10 p-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-[#f0875a] text-[11px] font-medium text-white">
            YB
          </span>
          <div className="flex-1">
            <div className="h-2 w-16 rounded-full bg-foreground/20" />
            <div className="mt-1 h-1.5 w-10 rounded-full bg-foreground/10" />
          </div>
          <span className="flex size-5 items-center justify-center rounded-md bg-[#f0875a] text-white">
            <HugeiconsIcon icon={SquareLock02Icon} size={11} strokeWidth={2} />
          </span>
        </div>

        {/* Client access rows */}
        <div className="mt-2 space-y-1.5">
          {rows.map((row) => (
            <div
              key={row.name}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                row.granted ? "" : "opacity-40"
              }`}
            >
              <span className="size-5 rounded-md bg-foreground/10" />
              <div className="h-1.5 flex-1 rounded-full bg-foreground/15" />
              {row.granted ? (
                <span className="flex size-4 items-center justify-center rounded-full bg-emerald/15 text-emerald">
                  <HugeiconsIcon icon={Tick02Icon} size={10} strokeWidth={3} />
                </span>
              ) : (
                <span className="size-4 rounded-full border border-foreground/15" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Card 2 — roles. Two member rows in a cool lavender panel: one admin (filled
// pill + edit glyph) and one viewer (outline pill + eye glyph).
function RolesGraphic() {
  const members = [
    { initials: "RS", role: "Admin", admin: true },
    { initials: "JM", role: "Viewer", admin: false },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(150deg,#eef0fc_0%,#e3e6fa_100%)] p-6">
      <div className="w-full max-w-[260px] space-y-2 rounded-xl bg-white/80 p-3 shadow-soft ring-1 ring-black/[0.04] backdrop-blur">
        {members.map((m) => (
          <div key={m.initials} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
            <span
              className={`flex size-7 items-center justify-center rounded-full text-[11px] font-medium text-white ${
                m.admin ? "bg-[#5e6ad2]" : "bg-foreground/30"
              }`}
            >
              {m.initials}
            </span>
            <div className="flex-1">
              <div className="h-2 w-16 rounded-full bg-foreground/20" />
              <div className="mt-1 h-1.5 w-10 rounded-full bg-foreground/10" />
            </div>
            {m.admin ? (
              <span className="flex items-center gap-1 rounded-full bg-[#5e6ad2] px-2 py-0.5 text-[10px] font-medium text-white">
                <HugeiconsIcon icon={PencilEdit02Icon} size={9} strokeWidth={2.2} />
                {m.role}
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full border border-[#5e6ad2]/30 px-2 py-0.5 text-[10px] font-medium text-[#5e6ad2]">
                <HugeiconsIcon icon={ViewIcon} size={9} strokeWidth={2.2} />
                {m.role}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Card 3 — invites. An invite card in a fresh mint panel: an avatar, a colored
// tag chip, and a soft "+" invite affordance.
function InvitesGraphic() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(150deg,#e9f7f1_0%,#d8f0e4_100%)] p-6">
      <div className="w-full max-w-[260px] rounded-xl bg-white/80 p-3 shadow-soft ring-1 ring-black/[0.04] backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#27a644] text-[11px] font-medium text-white">
            AD
          </span>
          <div className="flex-1">
            <div className="h-2 w-20 rounded-full bg-foreground/20" />
            <div className="mt-1.5">
              <span className="inline-block rounded-full bg-[#27a644]/12 px-2 py-0.5 text-[10px] font-medium text-[#1f7d35]">
                Designer
              </span>
            </div>
          </div>
        </div>

        {/* Invite affordance */}
        <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#27a644]/40 py-2 text-[11px] font-medium text-[#1f7d35]">
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2.4} />
          Invite teammate
        </div>
      </div>
    </div>
  );
}

// Per-client team access, real multi-user work (PROGRESS.md Step 16). Owner
// invites members per client as admin/viewer, with an agency-wide tag.
// Each card: a graphic on top (asset dropped later) + a bold lead and a muted
// continuation below it.
const CARDS: {
  key: string;
  lead: string; // bold inline lead-in
  rest: string; // muted continuation of the same sentence
}[] = [
  {
    key: "access",
    lead: "The owner holds the keys",
    rest: "Decide who sees which client. Someone added to one account never sees any of the others.",
  },
  {
    key: "roles",
    lead: "Admin or viewer",
    rest: "Admins edit a client's config and sources. Viewers can read, ask, and resolve, nothing more.",
  },
  {
    key: "invites",
    lead: "Invite with a tag",
    rest: "Bring teammates onto a client and label them agency-wide, like “Designer” or “Account lead”.",
  },
];

// Built for teams, a 3-card layout: eyebrow link, heading, tagline, then three
// cards each with a graphic and a captioned point.
export function TeamsSection() {
  return (
    <SectionFrame
      className="font-[family-name:var(--font-poppins)]"
      innerClassName="py-16 md:py-20"
    >
      <section id="teams">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl font-medium leading-tight tracking-tight text-foreground">
            The right people see the right clients.
          </h2>
          <p className="mt-5 max-w-2xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
            Add your team without handing everyone the keys to every account.
            Access is per client, with roles, so the people on an engagement see
            exactly what they should.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {CARDS.map((card, index) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              {/* Graphic on top — hand-built per card */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted ring-1 ring-black/[0.04]">
                {card.key === "access" && <AccessGraphic />}
                {card.key === "roles" && <RolesGraphic />}
                {card.key === "invites" && <InvitesGraphic />}
              </div>

              {/* Caption: bold lead + muted continuation */}
              <p className="mt-5 text-sm font-light leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{card.lead}</span>{" "}
                {card.rest}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </SectionFrame>
  );
}
