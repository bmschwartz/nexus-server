import {
  isAuthenticated,
  isGroupAdmin,
  isGroupMember,
  isGroupTrader,
  isMembershipGroupOwner,
  isMembershipUser,
} from "./utils";
import { and, or, rule } from "graphql-shield";
import { Context } from "../context";

const membershipUserFromParent = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isMembershipUser(ctx, parent.id)
  },
)

const membershipGroupOwnerFromParent = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isMembershipGroupOwner(ctx, parent.id)
  },
)

const groupMemberFromArgs = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isGroupMember(ctx, args.input.groupId)
  },
)

const groupAdminFromArgs = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isGroupAdmin(ctx, args.input.groupId)
  },
)

const groupTraderFromArgs = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isGroupTrader(ctx, args.input.groupId)
  },
)

export const GroupMembershipQueryPermissions = {
  myMembership: and(isAuthenticated, groupMemberFromArgs),
  myMemberships: isAuthenticated,
  membershipRequests: and(isAuthenticated, groupAdminFromArgs),
  groupMembers: and(isAuthenticated, or(groupAdminFromArgs, groupTraderFromArgs)),
  membership: and(isAuthenticated, or(membershipGroupOwnerFromParent, membershipUserFromParent)),
}

export const GroupMembershipMutationPermissions = {
  joinGroup: isAuthenticated,
  createMembership: and(isAuthenticated, groupAdminFromArgs),
  updateMembershipRole: and(isAuthenticated, groupAdminFromArgs),
  updateMembershipStatus: and(isAuthenticated, groupAdminFromArgs),
  updateMembershipActive: and(isAuthenticated, groupAdminFromArgs),
  deleteMembership: and(isAuthenticated, groupAdminFromArgs),
}

export const GroupMembershipPermissions = {
  "*": and(isAuthenticated, or(membershipGroupOwnerFromParent, membershipUserFromParent)),
}
