import { Composition } from "remotion";
import { Promo, TOTAL } from "./Promo";
import { FPS, H, W } from "./theme";

export function Root() {
  return <Composition id="BiteAtlasPromo" component={Promo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />;
}
