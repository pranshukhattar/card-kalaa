import { useCurrentFrame } from "remotion";
import { useTheme } from "../../../ThemeContext";
import type { CinematicData } from "../types";
import { Center, OutwardRule, Stage, Tracked, ramp } from "./shared";

export default function Frame06({ data }: { data: CinematicData }) {
  const frame = useCurrentFrame();
  const { palette } = useTheme();

  const dateOpacity = ramp(frame, 0, 25);
  const rule = ramp(frame, 25, 45);
  const venueOpacity = ramp(frame, 45, 65) * 0.55;

  return (
    <Stage duration={90} vignette={[0.35, 0.35, 0, 1]} toBlack>
      <Center>
        <Tracked size={52} spacing={0.3} color={palette.primary} opacity={dateOpacity}>
          {data.weddingDate}
        </Tracked>
        <div style={{ margin: "44px 0", opacity: 0.6 }}>
          <OutwardRule width={300} progress={rule} color={palette.primary} strokeWidth={1} />
        </div>
        <Tracked size={32} spacing={0.2} color={palette.text} opacity={venueOpacity}>
          {data.venueName}, {data.city}
        </Tracked>
      </Center>
    </Stage>
  );
}
