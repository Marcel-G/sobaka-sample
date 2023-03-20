import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda'
import { getDb } from './db';
import { YWebRTCMessage } from './interface';

const getTableName = () => process.env.TOPIC_TABLE_NAME
const getAWSRegion = () => process.env.AWS_REGION


async function subscribe(topic: string, connectionId: string) {
  try {
    return await getDb()
      .updateItem({
        TableName: getTableName(),
        Key: { name: { S: topic } },
        UpdateExpression: 'ADD receivers :r',
        ExpressionAttributeValues: {
          ':r': { SS: [connectionId] },
        },
      });
  } catch (err) {
    console.log(err)
    console.log(`Cannot update topic ${topic}: ${(err as Error).message}`);
  }
}

async function unsubscribe(topic: string, connectionId: string) {
  try {
    return await getDb()
      .updateItem({
        TableName: getTableName(),
        Key: { name: { S: topic } },
        UpdateExpression: 'DELETE receivers :r',
        ExpressionAttributeValues: {
          ':r': { SS: [connectionId] },
        },
      });
  } catch (err) {
    console.log(`Cannot update topic ${topic}: ${(err as Error).message}`);
  }
}

async function getReceivers(topic: string) {
  try {
    const { Item: item } = await getDb()
      .getItem({
        TableName: getTableName(),
        Key: { name: { S: topic } },
      });
    return item?.receivers ? item.receivers.SS : [];
  } catch (err) {
    console.log(`Cannot get topic ${topic}: ${(err as Error).message}`);
    return [];
  }
}

async function handleYWebRtcMessage(
  connectionId: string,
  message: YWebRTCMessage,
  send: (receiver: string, message: any) => Promise<void>,
) {
  const promises = [];

  if (message && message.type) {
    switch (message.type) {
      case 'subscribe':
        (message.topics || []).forEach(topic => {
          promises.push(subscribe(topic, connectionId));
        });
        break;
      case 'unsubscribe':
        (message.topics || []).forEach(topic => {
          promises.push(unsubscribe(topic, connectionId));
        });
        break;
      case 'publish':
        if (message.topic) {
          const receivers = await getReceivers(message.topic);
          receivers!.forEach(receiver => {
            promises.push(send(receiver, message));
          });
        }
        break;
      case 'ping':
        promises.push(send(connectionId, { type: 'pong' }));
        break;
    }
  }

  await Promise.all(promises);
}

function handleConnect(connectionId: string) {
  // Nothing to do
  console.log(`Connected: ${connectionId}`);
}

async function handleDisconnect(connectionId: string) {
  console.log(`Disconnected: ${connectionId}`);

  const items = await getDb().query({
    TableName: getTableName(),
    KeyConditionExpression: 'contains(receivers, :connectionId)',
    ExpressionAttributeValues: {
      ':connectionId': { S: connectionId }
    }
  });

  if (items.Items?.length) {
    await Promise.all(items.Items.map((item) => unsubscribe(item.name.S!, connectionId)));
  }

  // @todo -- clients not removed
//   2023-03-19T17:19:29.677Z	7c58f1fe-6119-4160-8656-19492ebfa1d9	INFO	Error CCeEzcI6IAMCIdw= ValidationException: Invalid operator used in KeyConditionExpression: contains
//   at throwDefaultError (/var/task/node_modules/@aws-sdk/smithy-client/dist-cjs/default-error-handler.js:8:22)
//   at deserializeAws_json1_0QueryCommandError (/var/task/node_modules/@aws-sdk/client-dynamodb/dist-cjs/protocols/Aws_json1_0.js:2140:51)
//   at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
//   at async /var/task/node_modules/@aws-sdk/middleware-serde/dist-cjs/deserializerMiddleware.js:7:24
//   at async /var/task/node_modules/@aws-sdk/middleware-signing/dist-cjs/middleware.js:14:20
//   at async /var/task/node_modules/@aws-sdk/middleware-retry/dist-cjs/retryMiddleware.js:27:46
//   at async /var/task/node_modules/@aws-sdk/middleware-logger/dist-cjs/loggerMiddleware.js:7:26
//   at async handleDisconnect (file:///var/task/dist/index.js:89:19)
//   at async Runtime.handler (file:///var/task/dist/index.js:136:17) {
// '$fault': 'client',
// '$metadata': {
//   httpStatusCode: 400,
//   requestId: 'PSK2LHG7CA6V9UAHMKPK0O1J67VV4KQNSO5AEMVJF66Q9ASUAAJG',
//   extendedRequestId: undefined,
//   cfId: undefined,
//   attempts: 2,
//   totalRetryDelay: 1
// },
// __type: 'com.amazon.coral.validate#ValidationException'
// }


}

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (
  event,
) => {
  if (!getTableName()) {
    return { statusCode: 502, body: 'Not configured' };
  }

  // The AWS "simple chat" example uses event.requestContext.domainName/...stage, but that doesn't work with custom domain
  // names. It also doesn't matter, this is anyways an internal (AWS->AWS) call.
  const apigwManagementApi = new ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `https://${event.requestContext.apiId}.execute-api.${getAWSRegion()}.amazonaws.com/${event.requestContext.stage}`,
  });

  const send = async (connectionId: string, message: any) => {
    try {
      await apigwManagementApi
        .postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify(message) as any,
        });
    } catch (err) {
      if ((err as any).statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await handleDisconnect(connectionId);
      } else {
        // Log, but otherwise ignore: There's not much we can do, really.
        console.log(`Error when sending to ${connectionId}: ${(err as Error).message}`);
      }
    }
  };

  try {
    switch (event.requestContext.routeKey) {
      case '$connect':
        handleConnect(event.requestContext.connectionId);
        break;
      case '$disconnect':
        await handleDisconnect(event.requestContext.connectionId);
        break;
      case '$default':
        await handleYWebRtcMessage(
          event.requestContext.connectionId,
          JSON.parse(event.body!),
          send,
        );
        break;
    }

    return { statusCode: 200 };
  } catch (err) {
    console.log(`Error ${event.requestContext.connectionId}`, err);
    return { statusCode: 500, body: (err as Error).message };
  }
}