import { and, or, rule } from "graphql-shield";
import { isAuthenticated, isGroupAdmin, isGroupTrader } from "./utils";
import { Context } from "../context";

const groupAdmin = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isGroupAdmin(parent.id, args, ctx, info)
  },
)

const groupTrader = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isGroupTrader(parent.id, args, ctx, info)
  },
)

export const GroupQueryPermissions = {
  myGroup: isAuthenticated,
  allGroups: isAuthenticated,
  group: isAuthenticated,
  groupExists: isAuthenticated,
}

export const GroupPermissions = {
  members: and(isAuthenticated, or(groupAdmin, groupTrader)),
}

export const GroupMutationPermissions = {
  createGroup: isAuthenticated,
  requestGroupAccess: isAuthenticated,
  renameGroup: and(isAuthenticated, groupAdmin),
  disableGroup: and(isAuthenticated, groupAdmin),
  updateGroupDescription: and(isAuthenticated, or(groupAdmin, groupTrader)),
}
