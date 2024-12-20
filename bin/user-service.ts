#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { UserServiceStack } from "../lib/user-service-stack";

const app = new cdk.App();
new UserServiceStack(app, "UserServiceStack");
