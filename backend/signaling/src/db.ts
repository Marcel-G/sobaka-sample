import { DynamoDB } from '@aws-sdk/client-dynamodb';

const dynamoDb = new DynamoDB({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION,
});

export const getDb = () => dynamoDb
