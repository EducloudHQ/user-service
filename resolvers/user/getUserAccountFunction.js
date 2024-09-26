import {
  sql,
  createPgStatement,
  select,
  toJsonObject,
} from "@aws-appsync/utils/rds";
import { util } from "@aws-appsync/utils";
export function request(ctx) {
  const { user_info } = ctx.prev.result;
  console.log(`prev result is ${ctx.prev.result}`);
  console.log(`user id is ${user_info.values.id}`);
  console.log(`user address is ${user_info.values.address}`);

  const query = sql`SELECT u.id,u.first_name, u.email,
  u.last_name,u.is_admin,u.phone_number,u.user_type,
  u.created_at,u.updated_at,
  u.profile_pic_url,
  a.city, a.street, a.zip,a.country, a.latitude, a.longitude
  FROM users u
  JOIN addresses a ON u.address_id = a.id
  WHERE u.id = ${user_info.values.id}`;

  return createPgStatement(query);
}

export function response(ctx) {
  const { error, result } = ctx;
  if (error) {
    return util.appendError(error.message, error.type, result);
  }
  console.log("returned result ", result);
  console.log("returned data ", toJsonObject(result)[0]);
  const {
    zip,
    city,
    latitude,
    country,
    longitude,
    street,
    ...user_info_result
  } = toJsonObject(result)[0][0];
  const user = {
    address: {
      zip,
      city,
      latitude,
      country,
      longitude,
      street,
    },

    ...user_info_result,
  };

  return user;
}
