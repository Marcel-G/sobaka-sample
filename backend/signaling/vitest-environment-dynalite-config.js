
export default {
  // Table config should be aligned with `signaling/infrastructure/db.tf`
  tables: [
    {
      TableName: "mock-topic-table",
      KeySchema: [
        { AttributeName: "topic", KeyType: "HASH" },
        { AttributeName: "receiver", KeyType: "RANGE" }
      ],
      AttributeDefinitions: [
        { AttributeName: "topic", AttributeType: "S" },
        { AttributeName: "receiver", AttributeType: "S" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "topic-index",
          KeySchema: [
            { AttributeName: "topic", KeyType: "HASH" }
          ],
          Projection: {
            ProjectionType: "ALL"
          },
        },
        {
          IndexName: "receiver-index",
          KeySchema: [
            { AttributeName: "receiver", KeyType: "HASH" }
          ],
          Projection: {
            ProjectionType: "ALL"
          },
        }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
      data: [
        { topic: "test-topic-1", receiver: 'test-connection-1' },
        { topic: "test-topic-1", receiver: 'test-connection-2' },
      ],
    },
  ],
  basePort: 8000,
};