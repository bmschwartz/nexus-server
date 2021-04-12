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

const membershipUser = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isMembershipUser(parent.id, args, ctx, info)
  },
)

const membershipGroupOwner = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isMembershipGroupOwner(parent.id, args, ctx, info)
  },
)

const groupMember = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isGroupMember(args.input.groupId, args, ctx, info)
  },
)

const groupAdmin = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isGroupAdmin(args.input.groupId, args, ctx, info)
  },
)

const groupTrader = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isGroupTrader(args.input.groupId, args, ctx, info)
  },
)

export const GroupMembershipQueryPermissions = {
  myMembership: and(isAuthenticated, groupMember),
  myMemberships: isAuthenticated,
  membershipRequests: and(isAuthenticated, groupAdmin),
  groupMembers: and(isAuthenticated, or(groupAdmin, groupTrader)),
  membership: and(isAuthenticated, or(membershipGroupOwner, membershipUser)),
}

export const GroupMembershipMutationPermissions = {
  joinGroup: isAuthenticated,
  createMembership: and(isAuthenticated, groupAdmin),
  updateMembershipRole: and(isAuthenticated, groupAdmin),
  updateMembershipStatus: and(isAuthenticated, groupAdmin),
  updateMembershipActive: and(isAuthenticated, groupAdmin),
  deleteMembership: and(isAuthenticated, groupAdmin),
}

export const GroupMembershipPermissions = {
  "*": and(isAuthenticated, or(membershipGroupOwner, membershipUser)),
}
