import { Context } from "../../context"
import { getActivePlatformFee } from "../../repository/PlatformFee"

export const PlatformFeeQuery = {
  async activePlatformFee(_: any, args: any, ctx: Context) {
    return getActivePlatformFee(ctx.prisma)
  },
}
