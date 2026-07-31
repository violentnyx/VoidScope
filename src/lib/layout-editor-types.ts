export type LayoutNodeWidth = "half" | "full";
export type LayoutNodeType = "identity" | "twitch" | "video" | "music" | "ranks" | "container";

export interface LayoutNode {
  id: string;
  type: LayoutNodeType;
  label: string;
  width: LayoutNodeWidth;
  visible: boolean;
  locked: boolean;
}

export interface LayoutPage {
  id: string;
  name: string;
  route: string;
  nodes: LayoutNode[];
}

export interface LayoutDocument {
  version: 1;
  navPosition: "top" | "left";
  pages: LayoutPage[];
}

export const DEFAULT_LAYOUT_DOCUMENT: LayoutDocument = {
  version: 1,
  navPosition: "top",
  pages: [{
    id: "home",
    name: "Home",
    route: "/",
    nodes: [
      { id: "identity", type: "identity", label: "Identidade", width: "half", visible: true, locked: false },
      { id: "twitch", type: "twitch", label: "Twitch", width: "half", visible: true, locked: false },
      { id: "video", type: "video", label: "Vídeo em destaque", width: "full", visible: true, locked: false },
      { id: "music", type: "music", label: "Ouvindo agora", width: "half", visible: true, locked: false },
      { id: "ranks", type: "ranks", label: "Ranks", width: "half", visible: true, locked: false },
    ],
  }],
};
