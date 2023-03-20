import { APIGatewayProxyWebsocketEventV2, Context as LambdaContext } from "aws-lambda"
import { YWebRTCMessage } from "../src/interface";


const createApiGatewayProxyWebsocketEventv2 = (ctx: Partial<APIGatewayProxyWebsocketEventV2['requestContext']> = {}, body?: string): APIGatewayProxyWebsocketEventV2 => ({
  requestContext: {
    routeKey: "",
    messageId: "",
    eventType: "CONNECT",
    extendedRequestId: "",
    requestTime: "",
    messageDirection: "IN",
    stage: "",
    connectedAt: 0,
    requestTimeEpoch: 0,
    requestId: "",
    domainName: "",
    connectionId: "",
    apiId: "",
    ...ctx
  },
  body,
  isBase64Encoded: false
})

export const createLambdaContext = (): LambdaContext => ({
  callbackWaitsForEmptyEventLoop: false,
  functionName: "",
  functionVersion: "",
  invokedFunctionArn: "",
  memoryLimitInMB: "",
  awsRequestId: "",
  logGroupName: "",
  logStreamName: "",
  getRemainingTimeInMillis: function (): number {
    throw new Error("Function not implemented.");
  },
  done: function (error?: Error | undefined, result?: any): void {
    throw new Error("Function not implemented.");
  },
  fail: function (error: string | Error): void {
    throw new Error("Function not implemented.");
  },
  succeed: function (messageOrObject: any): void {
    throw new Error("Function not implemented.");
  }
})

export const createConnectEvent = (connectionId: string) => createApiGatewayProxyWebsocketEventv2({
  routeKey: "$connect",
  connectionId
})

export const createDisconnectEvent = (connectionId: string) => createApiGatewayProxyWebsocketEventv2({
  routeKey: "$disconnect",
  connectionId
})

const createMessageEvent = (
  connectionId: string,
  message: YWebRTCMessage
) => createApiGatewayProxyWebsocketEventv2({
  routeKey: "$default",
  connectionId
}, JSON.stringify(message))

export const createSubscribeMessageEvent = (
  connectionId: string,
  topics: string[]
) => createMessageEvent(
  connectionId,
  {
    type: 'subscribe',
    topics
  }
)

export const createUnsubscribeMessageEvent = (
  connectionId: string,
  topics: string[]
) => createMessageEvent(
  connectionId,
  {
    type: 'unsubscribe',
    topics
  }
)

export const createPingMessageEvent = (
  connectionId: string,
) => createMessageEvent(
  connectionId,
  {
    type: 'ping',
  }
)

export const createPublishMessageEvent = (
  connectionId: string,
  topic: string,
  data: Record<string, unknown>
) => createMessageEvent(
  connectionId,
  {
    type: 'publish',
    topic,
    ...data
  }
)

