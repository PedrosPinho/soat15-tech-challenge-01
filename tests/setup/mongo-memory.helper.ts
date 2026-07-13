import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | undefined;

export const connectTestDatabase = async (): Promise<void> => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

export const disconnectTestDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  await mongod?.stop();
  mongod = undefined;
};

export const clearTestDatabase = async (): Promise<void> => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
};
