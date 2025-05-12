import dotenv from 'dotenv'
dotenv.config()

import { Kafka } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { useViemService } from './services/viem_service.js';
import consola from 'consola'
import { createWalletClient, encodeFunctionData, http, serializeTransaction } from 'viem'
import RealEstateMarketABI, {
    REAL_ESTATE_MARKET_ADDRESS,
} from "./abi/RealEstateMarketABI";
import { sepolia } from 'viem/chains'
import { createClient } from '@supabase/supabase-js'
import { Database } from './types/database.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

const TOPICS = {
  BUY_OFFER_DATA_VALIDATED: "buy-offer-data-validated",
  BUY_OFFER_WALLET_FETCHED: "buy-offer-wallet-fetched",
  BUY_OFFER_TRANSACTION_PREPARED: "buy-offer-transaction-prepared",
  BUY_OFFER_TRANSACTION_SIGNED: "buy-offer-transaction-signed",
  BUY_OFFER_TRANSACTION_CONFIRMED: "buy-offer-transaction-confirmed",
  BUY_OFFER_TRANSACTION_LOGGED: "buy-offer-transaction-logged",
  BUY_OFFER_ERROR: "buy-offer-error",
}

const logger = consola.create({
  defaults: {
    tag: 'nft-chain-system',
  },
});

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "nft-chain-system",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"]
});

export const produceMessage = async <T extends Record<string, any>>(topic: string, message: T & { processId?: string }) => {
  const producer = kafka.producer();
  
  try {
    await producer.connect();
    await producer.send({
      topic,
      messages: [{ 
        key: message.processId || uuidv4(), 
        value: JSON.stringify(message) 
      }]
    });
    console.log(`Message sent to topic ${topic}`);
  } finally {
    await producer.disconnect();
  }
};

export const createDirectServiceClient = () => {
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }
    return createClient<Database>(supabaseUrl, supabaseKey)
}

const runPrepareTransactionConsumer = async () => {
  const consumer = kafka.consumer({ groupId: 'prepareBuyOfferTransaction' });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPICS.BUY_OFFER_WALLET_FETCHED, fromBeginning: true });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        if (!message.value) return;
        const payload = JSON.parse(message.value.toString());
        logger.info("PrepareTransaction event received:", payload);
        
        const { offerId, walletAddress, price, processId } = payload;
        logger.info(`Preparing buy offer transaction for offerId: ${offerId}`);

        const { client: chainClient } = useViemService();
        const data = encodeFunctionData({
          abi: RealEstateMarketABI,
          functionName: "buyOffer",
          args: [BigInt(offerId)],
        });
        
        const transaction = await chainClient.prepareTransactionRequest({
          to: REAL_ESTATE_MARKET_ADDRESS,
          data: data,
          from: walletAddress,
          value: BigInt(price),
          account: walletAddress,
        });
        
        const serializedTransaction = serializeTransaction({
          chainId: sepolia.id,
          gas: transaction.gas,
          maxFeePerGas: transaction.maxFeePerGas,
          maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
          nonce: transaction.nonce,
          to: transaction.to,
          value: transaction.value,
          data: transaction.data,
        });
        
        // Send result to next topic in workflow
        await produceMessage(TOPICS.BUY_OFFER_TRANSACTION_PREPARED, {
          serializedTransaction,
          from: walletAddress,
          userId: payload.userId,
          offerId,
          processId
        });
        
        logger.success("Transaction preparation completed");
      } catch (error) {
        logger.error("Error in preparing transaction:", error);
        // Send error event if needed
        if (message.value) {
          const payload = JSON.parse(message.value.toString());
          await produceMessage(TOPICS.BUY_OFFER_ERROR, {
            error: error instanceof Error ? error.message : 'Unknown error',
            stage: 'preparation',
            payload,
            processId: payload.processId
          });
        }
      }
    },
  });
};

const runBroadcastTransactionConsumer = async () => {
  const consumer = kafka.consumer({ groupId: 'transaction-broadcast-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPICS.BUY_OFFER_TRANSACTION_SIGNED, fromBeginning: true });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        if (!message.value) return;
        const payload = JSON.parse(message.value.toString());
        logger.info("BroadcastTransaction event received:", payload);
        
        const { signedTransaction, processId, offerId, userId } = payload;
        logger.info(`Broadcasting transaction: ${signedTransaction}`);
        
        const walletClient = createWalletClient({
          chain: sepolia,
          transport: http(),
        });
        
        const transactionHash = await walletClient.sendRawTransaction({
          serializedTransaction: signedTransaction
        });
        
        const { client: chainClient } = useViemService();
        const receipt = await chainClient.waitForTransactionReceipt({
          hash: transactionHash,
          timeout: 100000,
        });
        
        logger.success("Transaction confirmed:", receipt);
        
        // Send confirmation to next topic in workflow
        await produceMessage(TOPICS.BUY_OFFER_TRANSACTION_CONFIRMED, {
          transactionHash: receipt.transactionHash,
          transactionStatus: receipt.status,
          offerId,
          userId,
          processId
        });
        
      } catch (error) {
        logger.error("Error in broadcasting transaction:", error);
        // Send error event if needed
        if (message.value) {
          const payload = JSON.parse(message.value.toString());
          await produceMessage('transaction-errors', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stage: 'broadcast',
            payload,
            processId: payload.processId
          });
        }
      }
    },
  });
};

const runLogTransactionConsumer = async () => {
  const consumer = kafka.consumer({ groupId: 'transaction-logging-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPICS.BUY_OFFER_TRANSACTION_CONFIRMED });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        if (!message.value) return;
        const payload = JSON.parse(message.value.toString());
        logger.info("LogTransaction event received:", payload);
        
        const { transactionHash, transactionStatus, offerId, userId, processId } = payload;
        logger.info(`Logging transaction with hash: ${transactionHash} and status: ${transactionStatus} and processId: ${processId}`);
        
        // Save into transaction supabase table
        const supabaseClient = createDirectServiceClient();
        const { data, error } = await supabaseClient
          .from("transactions")
          .insert([
            {
              process_id: processId,
              hash: transactionHash,
              status: transactionStatus,
              offer_id: offerId,
              user_id: userId,
            },
          ]);
          
        if (error) {
          throw new Error(`Supabase error: ${error.message}`);
        }
        
        logger.success("Transaction logged successfully");
        
        // Optional: send completion notification
        await produceMessage(TOPICS.BUY_OFFER_TRANSACTION_LOGGED, {
          transactionHash,
          transactionStatus,
          offerId,
          userId,
          processId
        });
        
      } catch (error) {
        logger.error("Error in logging transaction:", error);
        // Send error event if needed
        if (message.value) {
          const payload = JSON.parse(message.value.toString());
          await produceMessage('transaction-errors', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stage: 'logging',
            payload,
            processId: payload.processId
          });
        }
      }
    },
  });
};



const main = async () => {
  try {
    await runPrepareTransactionConsumer();
    await runBroadcastTransactionConsumer();
    await runLogTransactionConsumer();
    logger.success("All Kafka consumers started successfully");
  } catch (error) {
    logger.error("Error starting Kafka consumers:", error);
    process.exit(1);
  }
};

main();

