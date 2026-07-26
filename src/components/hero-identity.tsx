import { SocialLinks } from "@/components/social-links";
import type { HeroIdentity, RowItem } from "@/content/types";

export function HeroIdentityBlock({
  identity,
  socials,
  email,
}: {
  identity: HeroIdentity;
  socials: RowItem[];
  email?: string;
}) {
  const shapeClass = {
    square: "rounded-none",
    rounded: "rounded-2xl",
    circle: "rounded-full",
  }[identity.avatarShape];
  const socialLinks = <SocialLinks email={email} items={socials} />;

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`h-32 w-32 overflow-hidden sm:h-36 sm:w-36 ${shapeClass}`}
        style={{
          backgroundColor: `rgb(0 0 0 / ${identity.avatarBackgroundOpacity / 100})`,
          border: identity.avatarFrameEnabled
            ? `${identity.avatarFrameWidth}px solid ${identity.avatarFrameColor}`
            : "none",
        }}
      >
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
      {identity.socialLinksPosition === "below-avatar" ? socialLinks : null}

      <h1
        className={`${identity.socialLinksPosition === "below-avatar" ? "mt-6" : "mt-5"} font-mono text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl`}
      >
        {identity.name}
      </h1>
      <div className="mt-3 mb-4 h-px w-40 bg-white/40" />

      <p className="max-w-xs font-mono text-xs leading-relaxed text-white/60 sm:text-sm">
        {identity.bio}
      </p>
      {identity.socialLinksPosition === "below-bio" ? socialLinks : null}
    </div>
  );
}
