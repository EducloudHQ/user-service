import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const timestamp = util.time.nowEpochSeconds();

  console.log(`timestamp ${timestamp}`);

  const id = util.autoUlid();
  const { ...values } = ctx.args;
  values.userInput.id = id;

  values.userInput.created_at = timestamp;
  values.userInput.updated_at = timestamp;

  return {
    payload: {
      values: values.userInput,
    },
  };
}

export function response(ctx) {
  return ctx.result;
}
