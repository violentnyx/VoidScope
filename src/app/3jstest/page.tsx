import { HeroIdentityBlock } from "@/components/hero-identity";
import { TwitchLiveCard } from "@/components/twitch-live-card";
import { LatestVideoHighlight } from "@/components/latest-video-highlight";
import { NowPlayingWidget } from "@/components/now-playing-widget";
import { RanksWidget } from "@/components/ranks-widget";
import { ThreeLayoutLab } from "@/components/three-layout-lab";
import { getContactContent, getHomeContent } from "@/lib/get-content";

export const metadata = {
  title: "3JS Layout Lab | Nyx_aim",
  description: "Laboratório de layout editável e Three.js.",
};

export default async function ThreeJsTestPage() {
  const [home, contact] = await Promise.all([getHomeContent(), getContactContent()]);

  return (
    <ThreeLayoutLab
      widgets={{
        hero: (
          <HeroIdentityBlock
            identity={home.identity}
            socials={
              home.profileSocialButtonsEnabled
                ? home.otherSocials.items.filter(
                    (item) => !item.placements || item.placements.includes("bio"),
                  )
                : []
            }
            email={home.profileSocialButtonsEnabled ? contact.email : undefined}
          />
        ),
        twitch: <TwitchLiveCard content={home.twitchLive} />,
        video: <LatestVideoHighlight content={home.latestVideo} />,
        music: <NowPlayingWidget content={home.nowPlayingWidget} />,
        ranks: <RanksWidget content={home.ranksWidget} />,
      }}
    />
  );
}
