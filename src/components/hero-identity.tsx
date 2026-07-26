import type { HeroIdentity } from "@/content/types";

export function HeroIdentityBlock({ identity }: { identity: HeroIdentity }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 h-32 w-32 overflow-hidden rounded-full border border-white/15 bg-black/60 sm:h-36 sm:w-36">
        {identity.avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={identity.avatarSrc}
            alt={identity.avatarAlt}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
            avatar
          </div>
        )}
      </div>

      <h1 className="font-mono text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
        {identity.name}
      </h1>
      <div className="mt-3 mb-4 h-px w-40 bg-white/40" />

      <p className="max-w-xs font-mono text-xs leading-relaxed text-white/60 sm:text-sm">
        {identity.bio}
      </p>
    </div>
  );
}
