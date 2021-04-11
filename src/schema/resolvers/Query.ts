import { UserQuery } from "./User"
import { OrderSetQueries } from "./OrderSetResolvers"
import { BinanceQueries } from "./BinanceResolvers"
import { BitmexQueries } from "./BitmexResolvers"
import { ExchangeAccountQueries } from "./ExchangeAccountResolvers";
import { OrderQueries } from "./OrderResolvers";
import { AsyncOperationQueries } from "./AsyncOperationResolvers";
import { PositionQueries } from "./PositionResolvers"
import { GroupQuery } from "./GroupResolvers";
import { GroupMembershipQuery } from "./GroupMembershipResolvers";
import { PlatformFeeQuery } from "./PlatformFee";

export const Query = {
  ...UserQuery,
  ...GroupQuery,
  ...OrderQueries,
  ...BitmexQueries,
  ...BinanceQueries,
  ...OrderSetQueries,
  ...PositionQueries,
  ...PlatformFeeQuery,
  ...GroupMembershipQuery,
  ...AsyncOperationQueries,
  ...ExchangeAccountQueries,
}
