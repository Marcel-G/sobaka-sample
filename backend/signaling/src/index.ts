import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { marshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda'
import { getDb } from './db';
import { YWebRTCMessage } from './interface';

const getTableName = () => process.env.TOPIC_TABLE_NAME
const getAWSRegion = () => process.env.AWS_REGION


async function subscribe(topic: string, connection_id: string) {
  try {
    return await getDb()
      .putItem({
        TableName: getTableName(),
        Item: marshall({ topic, receiver: connection_id }),
      });
  } catch (err) {
    throw new Error(`Cannot update topic ${topic}: ${(err as Error).message}`);
  }
}

async function unsubscribe(topic: string, connection_id: string) {
  try {
    return await getDb()
      .deleteItem({
        TableName: getTableName(),
        Key: marshall({ topic, receiver: connection_id }),
      });
  } catch (err) {
    throw new Error(`Cannot update topic ${topic}: ${(err as Error).message}`);
  }
}

async function getReceivers(topic: string) {
  try {
    const { Items: items } = await getDb()
      .query({
        TableName: getTableName(),
        IndexName: "topic-index",
        KeyConditionExpression: "topic = :topic",
        ExpressionAttributeValues: marshall({
          ':topic': topic
        })
      });

    if (!items) return []
    return items.map((item) => item.receiver.S!)
  } catch (err) {
    throw new Error(`Cannot get topic ${topic}: ${(err as Error).message}`);
  }
}

async function handleYWebRtcMessage(
  connection_id: string,
  message: YWebRTCMessage,
  send: (receiver: string, message: any) => Promise<void>,
) {
  const promises = [];

  if (message && message.type) {
    switch (message.type) {
      case 'subscribe':
        (message.topics || []).forEach(topic => {
          promises.push(subscribe(topic, connection_id));
        });
        break;
      case 'unsubscribe':
        (message.topics || []).forEach(topic => {
          promises.push(unsubscribe(topic, connection_id));
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
        promises.push(send(connection_id, { type: 'pong' }));
        break;
    }
  }

  await Promise.all(promises);
}

function handleConnect(connection_id: string) {
  // Nothing to do
  console.log(`Connected: ${connection_id}`);
}

async function handleDisconnect(connection_id: string) {
  console.log(`Disconnected: ${connection_id}`);

  const { Items: items } = await getDb()
    .query({
      TableName: getTableName(),
      IndexName: "receiver-index",
      KeyConditionExpression: "receiver = :receiver",
      ExpressionAttributeValues: marshall({
        ':receiver': connection_id
      })
    });


  if (items) {
    await Promise.all(items.map((item) => unsubscribe(item.topic.S!, connection_id)));
  }
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

  const send = async (connection_id: string, message: any) => {
    try {
      await apigwManagementApi
        .postToConnection({
          ConnectionId: connection_id,
          Data: JSON.stringify(message) as any,
        });
    } catch (err) {
      if ((err as any).statusCode === 410) {
        console.log(`Found stale connection, deleting ${connection_id}`);
        await handleDisconnect(connection_id);
      } else {
        // Log, but otherwise ignore: There's not much we can do, really.
        throw new Error(`Error when sending to ${connection_id}: ${(err as Error).message}`);
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