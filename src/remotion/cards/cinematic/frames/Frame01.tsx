import { useCurrentFrame } from "remotion";
import { useTheme } from "../../../ThemeContext";
import type { CinematicData } from "../types";
import { Center, Stage, Tracked, ramp } from "./shared";

export default function Frame01({ data }: { data: CinematicData }) {
  const frame = useCurrentFrame();
  const theme = useTheme();

  const opacity = ramp(frame, 0, 25);
  const spacing = ramp(frame, 0, 25, 0.35, 0.5);

  return (
    <Stage duration={75} vignette={[0, 0.5, 0, 70]}>
      <Center>
        <Tracked size={38} spacing={spacing} color={theme.palette.primary} opacity={opacity}>
          {data.openingLine}
        </Tracked>
      </Center>
    </Stage>
  );
}
