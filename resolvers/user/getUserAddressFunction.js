import {
  sql,
  select,
  createPgStatement,
  toJsonObject,
} from "@aws-appsync/utils/rds";
import { util } from "@aws-appsync/utils";
export function request(ctx) {
  console.log(`user details are ${ctx.prev.result}`);
  const { address_id } = ctx.prev.result.user;
  console.log(`address id is ${address_id}`);

  const q1 = select({
    table: "addresses",
    where: {
      id: {
        eq: address_id,
      },
    },
  });

  return createPgStatement(q1);
}

export function response(ctx) {
  const { error, result } = ctx;
  if (error) {
    return util.appendError(error.message, error.type, result);
  }
  console.log("returned result ", result);
  console.log("returned data ", toJsonObject(result)[0][0]);

  return {
    address: toJsonObject(result)[0][0],
    ...ctx.prev.result.user,
  };
}
