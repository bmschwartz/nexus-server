import { getAsyncOperation } from "../../repository/AsyncOperationRepository"
import { Context } from "../../context"

export const AsyncOperationQueries = {
  async asyncOperationStatus(parent: any, args: any, ctx: Context) {
    const { input: { id: operationId } } = args
    const operation = await getAsyncOperation(ctx, operationId)

    if (!operation) {
      return null
    }

    return { operation }
  },
}
