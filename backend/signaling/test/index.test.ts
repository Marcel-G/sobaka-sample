// @vitest-environment dynalite

import { test, expect, vi, describe, beforeEach, afterEach } from "vitest";
import { useDynalite } from "vitest-environment-dynalite";
import { handler } from '../src/index';
import crypto from 'crypto';
import { createConnectEvent, createDisconnectEvent, createLambdaContext, createPingMessageEvent, createPublishMessageEvent, createSubscribeMessageEvent, createUnsubscribeMessageEvent } from "./eventMocks";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { getDb } from "../src/db";
import { ApiGatewayManagementApi } from "@aws-sdk/client-apigatewaymanagementapi";
import { marshall } from "@aws-sdk/util-dynamodb";

useDynalite();

const mockDb = new DynamoDB({
  endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
  region: "local",
})

const mockTable = 'mock-topic-table'

vi.mock('../src/db')
vi.mock('@aws-sdk/client-apigatewaymanagementapi', () => {
  const ApiGatewayManagementApi = vi.fn()
  ApiGatewayManagementApi.prototype.deleteConnection = vi.fn(),
    ApiGatewayManagementApi.prototype.getConnection = vi.fn(),
    ApiGatewayManagementApi.prototype.postToConnection = vi.fn(),
    ApiGatewayManagementApi.prototype.destroy = vi.fn(),
    ApiGatewayManagementApi.prototype.send = vi.fn()

  return {
    ApiGatewayManagementApi
  }
})

describe("Signaling lambda", () => {
  beforeEach(() => {
    vi.stubEnv('TOPIC_TABLE_NAME', mockTable)
    vi.mocked(getDb).mockImplementation(() => mockDb)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("A new client connection", () => {
    test("should resolve with status 200", async () => {
      const connectionId = crypto.randomUUID();

      const context = createLambdaContext();

      const result = await handler(createConnectEvent(connectionId), context, vi.fn())

      expect(result).toEqual({ statusCode: 200 })
    });
  })

  describe("A client subscribes to topics", () => {
    test("should resolve with status 200", async () => {
      const connectionId = crypto.randomUUID();
      const topicId = crypto.randomUUID();

      const context = createLambdaContext();

      const result = await handler(createSubscribeMessageEvent(connectionId, [topicId]), context, vi.fn())

      expect(result).toEqual({ statusCode: 200 })
    });

    test("should add the connection to the topic in the db", async () => {
      const connectionId = crypto.randomUUID();
      const topicId = crypto.randomUUID();

      const context = createLambdaContext();

      const result = await handler(createSubscribeMessageEvent(connectionId, [topicId]), context, vi.fn())

      expect(result).toEqual({ statusCode: 200 })

      const { Item: item } = await getDb()
        .getItem({
          TableName: mockTable,
          Key: marshall({ topic: topicId, receiver: connectionId }),
        });

      expect(item).toEqual(marshall({ topic: topicId, receiver: connectionId }))
    });
  })

  describe("A client unsubscribes from topics", () => {
    test("should resolve with status 200", async () => {
      const connectionId = 'test-connection-1';
      const topicId = 'test-topic-1';

      const context = createLambdaContext();

      const result = await handler(createUnsubscribeMessageEvent(connectionId, [topicId]), context, vi.fn())

      expect(result).toEqual({ statusCode: 200 })
    });

    test("should remove the topic from the topic in the db", async () => {
      const connectionId = 'test-connection-1';
      const topicId = 'test-topic-1';

      const context = createLambdaContext();

      const result = await handler(createUnsubscribeMessageEvent(connectionId, [topicId]), context, vi.fn())

      expect(result).toEqual({ statusCode: 200 })

      const { Item: item } = await getDb()
        .getItem({
          TableName: mockTable,
          Key: marshall({ topic: topicId, receiver: connectionId }),
        });

      expect(item).toBeUndefined()
    });
  })

  describe("A client publishes to a topic", () => {
    test("should resolve with status 200", async () => {
      const connectionId = 'test-connection-1';
      const topicId = 'test-topic-1';

      const data = {
        test: 123
      }

      const context = createLambdaContext();

      const result = await handler(createPublishMessageEvent(connectionId, topicId, data), context, vi.fn())

      expect(result).toEqual({ statusCode: 200 })
    });

    test("should broadcast the messages to other connections in the topic", async () => {
      const connectionId = 'test-connection-1';
      const topicId = 'test-topic-1';

      const data = {
        test: 123
      }

      const context = createLambdaContext();

      const result = await handler(createPublishMessageEvent(connectionId, topicId, data), context, vi.fn())

      expect(result).toEqual({ statusCode: 200 })

      const [instance] = vi.mocked(ApiGatewayManagementApi).mock.instances

      expect(instance.postToConnection).toHaveBeenCalledTimes(2)
      expect(instance.postToConnection).toHaveBeenNthCalledWith(1, {
        ConnectionId: 'test-connection-1',
        Data: JSON.stringify({ type: "publish", topic: topicId, test: 123 })
      })

      expect(instance.postToConnection).toHaveBeenNthCalledWith(2, {
        ConnectionId: 'test-connection-2',
        Data: JSON.stringify({ type: "publish", topic: topicId, test: 123 })
      })
    });
  })

  describe("A client sends a ping event", () => {
    test("should resolve with status 200", async () => {
      const connectionId = crypto.randomUUID();

      const context = createLambdaContext();

      const result = await handler(createPingMessageEvent(connectionId), context, vi.fn())

      expect(result).toEqual({ statusCode: 200 })

    });

    test("should broadcast pong back to connection", async () => {
      const connectionId = crypto.randomUUID();

      const context = createLambdaContext();

      const result = await handler(createPingMessageEvent(connectionId), context, vi.fn())

      expect(result).toEqual({ statusCode: 200 })

      const [instance] = vi.mocked(ApiGatewayManagementApi).mock.instances

      expect(instance.postToConnection).toHaveBeenCalledTimes(1)

      expect(instance.postToConnection).toHaveBeenCalledWith({
        ConnectionId: connectionId,
        Data: JSON.stringify({ type: "pong" })
      })
    });
  })

  describe("A client disconnects", () => {
    test("should resolve with status 200", async () => {
      const connectionId = 'test-connection-1';

      const context = createLambdaContext();

      const result = await handler(createDisconnectEvent(connectionId), context, vi.fn())

      expect(result).toEqual({ statusCode: 200 })
    });

    test("should remove the connection from all topics", async () => {
      const connectionId = 'test-connection-1';
      const topicId = 'test-topic-1'

      const context = createLambdaContext();

      const result = await handler(createDisconnectEvent(connectionId), context, vi.fn())

      expect(result).toEqual({ statusCode: 200 })

      const { Item: item } = await getDb()
        .getItem({
          TableName: mockTable,
          Key: marshall({ topic: topicId, receiver: connectionId }),
        });

      expect(item).toBeUndefined()
    });
  })
})
