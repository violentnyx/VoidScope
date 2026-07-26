import { HeroIdentityBlock } from "@/components/hero-identity";
import { TwitchLiveCard } from "@/components/twitch-live-card";
import { LatestVideoHighlight } from "@/components/latest-video-highlight";
import { NowPlayingWidget } from "@/components/now-playing-widget";
import { RanksWidget } from "@/components/ranks-widget";
import { ChannelGroupBlock } from "@/components/channel-group";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import { getContactContent, getHomeContent, getPagesStatus } from "@/lib/get-content";
import { isAdminRequest } from "@/lib/is-admin-request";

export default async function HomePage() {
  const pages = await getPagesStatus();
  if (pages.home === "staging" && !(await isAdminRequest())) {
    return <MaintenanceScreen />;
  }

  const [home, contact] = await Promise.all([
    getHomeContent(),
    getContactContent(),
  ]);

  return (
    <div className="flex flex-col gap-16 sm:gap-24">
      <section className="grid grid-cols-1 items-center gap-12 sm:grid-cols-2 sm:gap-8">
        <HeroIdentityBlock
          identity={home.identity}
          socials={
            home.profileSocialButtonsEnabled
              ? home.otherSocials.items.filter(
                  (item) => !item.placements || item.placements.includes("bio"),
                )
              : []
          }
          email={
            home.profileSocialButtonsEnabled ? contact.email : undefined
          }
        />
        <TwitchLiveCard content={home.twitchLive} />
      </section>

      <LatestVideoHighlight content={home.latestVideo} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NowPlayingWidget content={home.nowPlayingWidget} />
        <RanksWidget content={home.ranksWidget} />
      </section>

      <div>
        <ChannelGroupBlock group={home.youtube} />
        <ChannelGroupBlock group={home.tiktok} />
        <ChannelGroupBlock
          group={{
            ...home.otherSocials,
            items: home.otherSocials.items.filter(
              (item) => !item.placements || item.placements.includes("page"),
            ),
          }}
        />
      </div>
    </div>
  );
}
