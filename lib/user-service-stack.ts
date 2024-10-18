import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { MergeType, SourceApiAssociation } from "aws-cdk-lib/aws-appsync";
import { SourceApiAssociationMergeOperation } from "awscdk-appsync-utils/lib/source-api-association-merge";
export class UserServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //Get Merge API role ARN
    const roleArn = this.node.tryGetContext("roleArn");
    const mergedApiExecutionRole = iam.Role.fromRoleArn(
      this,
      "MergedApiExecutionRole",
      roleArn
    );

    const mergedApiArn = this.node.tryGetContext("mergedApiArn");
    const mergedApiId = this.node.tryGetContext("mergedApiId");

    //create our API
    const api = new appsync.GraphqlApi(this, "user-service-api", {
      name: "user-service-api",
      definition: appsync.Definition.fromFile("./schema/schema.graphql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
        },
      },
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
      },
      xrayEnabled: true,
    });

    const mergedApi = appsync.GraphqlApi.fromGraphqlApiAttributes(
      this,
      "MergedApi",
      {
        graphqlApiArn: mergedApiArn,
        graphqlApiId: mergedApiId,
      }
    );

    const sourceApiAssociation = new SourceApiAssociation(
      this,
      "DeliverySourceApiAssociation",
      {
        sourceApi: api,
        mergedApi: mergedApi,
        mergedApiExecutionRole: mergedApiExecutionRole,
        mergeType: MergeType.MANUAL_MERGE,
      }
    );

    new SourceApiAssociationMergeOperation(this, "SourceApiMergeOperation", {
      sourceApiAssociation: sourceApiAssociation,
      alwaysMergeOnStackUpdate: true,
    });

    // Create username and password secret for DB Cluster
    const secret = new rds.DatabaseSecret(this, "AuroraSecret", {
      username: "user_service_aurora",
    });

    const vpc = new ec2.Vpc(this, "auroraVpc", {
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      maxAzs: 2, // Default is all AZs in region
      vpcName: "user-service-aurora-vpc",

      restrictDefaultSecurityGroup: false,
    });

    const cluster = new rds.DatabaseCluster(this, "UserDatabase", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_3,
      }),

      vpc: vpc,
      enableDataApi: true, //for serverless capabilities
      credentials: rds.Credentials.fromSecret(secret),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      serverlessV2MaxCapacity: 4,
      serverlessV2MinCapacity: 0.5,
      defaultDatabaseName: "user_service_db",
      readers: [
        rds.ClusterInstance.serverlessV2("reader1", {
          scaleWithWriter: true,
        }),
      ],
      writer: rds.ClusterInstance.provisioned("writer", {
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.BURSTABLE3,
          ec2.InstanceSize.MEDIUM
        ),
      }),
    });

    // Create 2 datasources

    const rdsDatasource = api.addRdsDataSourceV2(
      "AuroraDatasource",
      cluster,
      secret,
      "user_service_db"
    );

    const nonDataSource = api.addNoneDataSource("none");

    ////////////////

    const formatUserAccountInputFunction = new appsync.AppsyncFunction(
      this,
      "formatUserAccountInputFunction",
      {
        api,
        dataSource: nonDataSource,
        name: "formatUserAccountInputFunction",
        code: appsync.Code.fromAsset(
          "./resolvers/user/formatUserAccountInput.js"
        ),
        runtime: appsync.FunctionRuntime.JS_1_0_0,
      }
    );
    const getUserDetailsFunction = new appsync.AppsyncFunction(
      this,
      "getUserDetailsFunction",
      {
        api,
        dataSource: rdsDatasource,
        name: "getUserDetailsFunction",
        code: appsync.Code.fromAsset(
          "./resolvers/user/getUserDetailsFunction.js"
        ),
        runtime: appsync.FunctionRuntime.JS_1_0_0,
      }
    );
    const getUserAddressFunction = new appsync.AppsyncFunction(
      this,
      "getUserAddressFunction",
      {
        api,
        dataSource: rdsDatasource,
        name: "getUserAddressFunction",
        code: appsync.Code.fromAsset(
          "./resolvers/user/getUserAddressFunction.js"
        ),
        runtime: appsync.FunctionRuntime.JS_1_0_0,
      }
    );
    const getUserAccountFunction = new appsync.AppsyncFunction(
      this,
      "getUserAccountFunction",
      {
        api,
        dataSource: rdsDatasource,
        name: "getUserAccountFunction",
        code: appsync.Code.fromAsset(
          "./resolvers/user/getUserAccountFunction.js"
        ),
        runtime: appsync.FunctionRuntime.JS_1_0_0,
      }
    );
    const createUserAccountFunction = new appsync.AppsyncFunction(
      this,
      "createUserAccountFunction",
      {
        api,
        dataSource: rdsDatasource,
        name: "createUserAccountFunction",
        code: appsync.Code.fromAsset(
          "./resolvers/user/createUserAccountFunction.js"
        ),
        runtime: appsync.FunctionRuntime.JS_1_0_0,
      }
    );
    new appsync.Resolver(this, "createUserTableResolver", {
      api,
      typeName: "Mutation",
      fieldName: "createUserTable",
      dataSource: rdsDatasource,
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      code: appsync.Code.fromAsset("./resolvers/rds_table/createRdsTable.js"),
    });

    new appsync.Resolver(this, "createUserAccountPipelineResolver", {
      api,
      typeName: "Mutation",
      fieldName: "createUserAccount",
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      code: appsync.Code.fromAsset("./resolvers/pipeline/default.js"),
      pipelineConfig: [
        formatUserAccountInputFunction,
        createUserAccountFunction,
        getUserAccountFunction,
      ],
    });
    new appsync.Resolver(this, "getUserAccountResolver", {
      api,
      typeName: "Query",
      fieldName: "getUserAccount",
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      code: appsync.Code.fromAsset("./resolvers/pipeline/default.js"),
      pipelineConfig: [getUserDetailsFunction, getUserAddressFunction],
    });

    //////////////////////////
    new cdk.CfnOutput(this, "appsync api key", {
      value: api.apiKey!,
    });

    new cdk.CfnOutput(this, "appsync endpoint", {
      value: api.graphqlUrl,
    });

    new cdk.CfnOutput(this, "appsync apiId", {
      value: api.apiId,
    });
  }
}
