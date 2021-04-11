import { readFileSync } from "fs"
import { gql } from "apollo-server"
import { resolve } from "path"

export const typeDefs = gql(
  readFileSync(resolve(__dirname, "./schema.graphql"), { encoding: "utf8" }),
)
