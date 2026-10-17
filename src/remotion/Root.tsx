import { Composition } from "remotion";
import type { CardConfig } from "@/lib/types";
import { Composition as Caricature } from "./cards/caricature";
import { config as caricature } from "./cards/caricature/config";
import { Composition as Palace } from "./cards/palace";
import { config as palace } from "./cards/palace/config";
import { Composition as MultiEvent } from "./cards/multi-event";
import { config as multiEvent } from "./cards/multi-event/config";
import { Composition as Housewarming } from "./cards/housewarming";
import { config as housewarming } from "./cards/housewarming/config";
import { Composition as Cinematic } from "./cards/cinematic";
import { config as cinematic } from "./cards/cinematic/config";

const totalFrames = (config: CardConfig) =>
  config.frames.reduce((sum, f) => sum + f.durationInFrames, 0);

const cards = [
  { config: caricature, component: Caricature },
  { config: palace, component: Palace },
  { config: multiEvent, component: MultiEvent },
  { config: housewarming, component: Housewarming },
  { config: cinematic, component: Cinematic },
];

export const Root: React.FC = () => (
  <>
    {cards.map(({ config, component }) => (
      <Composition
        key={config.id}
        id={config.id}
        component={component}
        fps={config.fps}
        width={config.width}
        height={config.height}
        durationInFrames={totalFrames(config)}
        defaultProps={{
          config,
          activeThemeId: config.defaultThemeId,
          props: { data: {} },
        }}
      />
    ))}
  </>
);
