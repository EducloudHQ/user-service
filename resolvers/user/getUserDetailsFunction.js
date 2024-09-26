import {
  sql,
  select,
  createPgStatement,
  toJsonObject,
} from "@aws-appsync/utils/rds";
import { util } from "@aws-appsync/utils";
export function request(ctx) {
  const { id } = ctx.args;

  const q1 = select({
    table: "users",
    where: {
      id: { eq: id },
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
    user: toJsonObject(result)[0][0],
  };
}
