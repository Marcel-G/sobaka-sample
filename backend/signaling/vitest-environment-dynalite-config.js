
export default {
  // Table config should be aligned with `signaling/infrastructure/db.tf`
  tables: [
    {
      TableName: "mock-topic-table",
      KeySchema: [{ AttributeName: "name", KeyType: "HASH" }],
      AttributeDefinitions: [
        { AttributeName: "name", AttributeType: "S" },
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
      data: [
        { name: "test-topic-1", receivers: new Set(['test-connection-1', 'test-connection-2']) }
      ],
    },
  ],
  basePort: 8000,
};