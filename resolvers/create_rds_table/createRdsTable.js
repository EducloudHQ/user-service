import { sql, createPgStatement, toJsonObject } from "@aws-appsync/utils/rds";
export function request(ctx) {
  const s1 = sql`CREATE TABLE addresses (
    id VARCHAR(36) PRIMARY KEY,
    city VARCHAR(255),
    zip INT,
    street VARCHAR(255),
    country VARCHAR(255),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6)
)`;
  const s2 = sql`CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255),    
    last_name VARCHAR(255),
    profile_pic_url VARCHAR(255),
    is_admin BOOLEAN,
    address_id VARCHAR(36) REFERENCES addresses(id) ON DELETE SET NULL,
    phone_number VARCHAR(15),
    user_type VARCHAR(50) CHECK (user_type IN ('ADMIN', 'CUSTOMER','COURIER')) NOT NULL,
    created_at BIGINT,
    updated_at BIGINT
)`;

  return createPgStatement(s1, s2);
}
export function response(ctx) {
  const { error, result } = ctx;
  if (error) {
    return util.appendError(error.message, error.type, result);
  }
  return result;
}
