import {
  insert,
  createPgStatement,
  toJsonObject,
} from "@aws-appsync/utils/rds";
import { util } from "@aws-appsync/utils";
export function request(ctx) {
  const { values } = ctx.prev.result;
  console.log(`prev result is ${ctx.prev.result}`);
  console.log(`user id is ${values.id}`);
  console.log(`user address is ${values.address}`);

  const id = util.autoUlid();
  let { address, ...userInfo } = values;
  console.log(`address is ${address}`);
  console.log(`user info is ${userInfo}`);
  address.id = id;
  const insertAddress = insert({
    table: "addresses",
    values: address,
  });
  userInfo.address_id = id;

  const insertUser = insert({ table: "users", values: userInfo });

  return createPgStatement(insertAddress, insertUser);
}

export function response(ctx) {
  const { error, result } = ctx;
  if (error) {
    return util.appendError(error.message, error.type, result);
  }
  console.log("returned result ", result);
  console.log("returned data ", toJsonObject(result)[1]);
  return {
    user_info: ctx.prev.result,
    result: toJsonObject(result)[1][0],
  };
}
