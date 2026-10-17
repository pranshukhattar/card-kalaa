import { useTheme } from "@/remotion/ThemeContext";
import type { CardProps } from "@/lib/types";

const Frame02: React.FC<{ data: CardProps["data"] }> = () => {
  const theme = useTheme();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.palette.background,
        color: theme.palette.text,
        fontSize: 48,
        fontFamily: "sans-serif",
      }}
    >
      caricature / frame-02 / {theme.label}
    </div>
  );
};

export default Frame02;
