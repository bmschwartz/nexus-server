import { rule, shield, and } from "graphql-shield"
import { Context } from "../context"

const isAuthenticated = rule()((parent, args, { userId }) => {
  return !!userId
})

const canViewPersonalData = rule({ cache: "strict" })(
  async (parent, args, ctx: Context) => {
    return parent.id === ctx.userId
  },
)

export const permissions = shield({
  Query: {
    me: isAuthenticated,
    userIdByEmail: isAuthenticated,
  },
  User: {
    admin: and(isAuthenticated, canViewPersonalData),
    email: and(isAuthenticated, canViewPersonalData),
  },
})
