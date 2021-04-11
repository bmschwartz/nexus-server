import { prisma } from "./context";
import { initBitmex } from "./exchange/bitmex";

export function bootstrap() {
  initBitmex(prisma)
    .then(r => console.log("Start Bitmex Client: Success"))
    .catch(e => console.error(`Start Bitmex Client: Failed (${e})`))
}
