import dotenv from 'dotenv'
dotenv.config()

import { useViemService } from './services/viem_service'
import { Client, Variables, TaskService, Task  } from "camunda-external-task-client-js";
import consola from 'consola'
import { createWalletClient, encodeFunctionData, http, serializeTransaction } from 'viem'
import RealEstateMarketABI, {
    REAL_ESTATE_MARKET_ADDRESS,
} from "./abi/RealEstateMarketABI";
import { sepolia } from 'viem/chains'
import axios from "axios";
import { createClient } from '@supabase/supabase-js'
import { Database } from './types/database.js'
import { log } from 'console';

const camundaApiUrl = process.env.CAMUNDA_API_URL || 'http://localhost:8080/engine-rest'
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

const logger = consola.create({
    defaults: {
      tag: "camunda_market_service",
    },
  });

  const client = new Client({
    baseUrl: camundaApiUrl,
    asyncResponseTimeout: 10000,
    maxTasks: 10
})

export const createDirectServiceClient = () => {
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }
    return createClient<Database>(supabaseUrl, supabaseKey)
}


client.subscribe("prepareBuyOfferTransaction", async function({ task, taskService }: { task: Task, taskService: TaskService }) {
    try {
      logger.info("prepareBuyOfferTransaction task executing...");
      logger.info("Task variables:", task.variables.getAll());
      const offerId: string = task.variables.get("offerId");
      const userWallet = task.variables.get("walletAddress");
      const offerPrice: string = task.variables.get("price");
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
        from: userWallet,
        value: BigInt(offerPrice),
        account: userWallet,
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
      const processVariables = new Variables();
      processVariables.set("transactionData", {serializedTransaction: serializedTransaction, from: userWallet });
      await taskService.complete(task, processVariables);
      logger.success("Transaction preparation completed:", transaction);
    } catch (error) {
      logger.error("Error in getUserWalletAddress task:", error);
      if (error instanceof Error) {
        await taskService.handleBpmnError(
          task, 
          "FETCH WALLET ERROR",
          `Wallet address fetching failed: ${error.message}`
        );
      }
    }
  });

  client.subscribe("broadcastTransaction", async function({ task, taskService }: { task: Task, taskService: TaskService }) {
    try {
      logger.info("broadcastTransaction task executing...");
      const signedTransaction = task.variables.get("signedTransaction");
      logger.info(`Broadcasting transaction: ${signedTransaction}`);
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: http(),
      });
      const transactionHash = await walletClient.sendRawTransaction({serializedTransaction: signedTransaction});
      const processVariables = new Variables();
      processVariables.set("transactionHash", transactionHash);
      await taskService.complete(task, processVariables);
      logger.success("Transaction broadcasted successfully:", transactionHash);
      const { client: chainClient } = useViemService();
      const receipt = await chainClient.waitForTransactionReceipt({
        hash: transactionHash,
        timeout: 100000,
      })
      logger.success("Transaction receipt:", receipt);
      const messagePayload = {
        messageName: "TransactionConfirmed",
        processInstanceId: task.processInstanceId,
        processVariables: {
          transactionHash: { value: receipt.transactionHash, type: "String" },
          transactionStatus: { value: receipt.status, type: "String" },
        },
      }
      logger.info("Sending message to Camunda:", messagePayload);
      const response = await axios.post(camundaApiUrl+'/message', messagePayload);
      logger.info("Message sent to Camunda:", response.data);
    } catch (error) {
      logger.error("Error in broadcastTransaction task:", error);
      if (error instanceof Error) {
        await taskService.handleBpmnError(
          task,
          "BROADCAST TRANSACTION ERROR",
          `Transaction broadcasting failed: ${error.message}`
        );
      }
    }
  });


client.subscribe("logBuyOfferTransaction", async function({ task, taskService }: { task: Task, taskService: TaskService }) {
    try {
      logger.info("logBuyOfferTransaction task executing...");
      const transactionHash: string = task.variables.get("transactionHash");
      const transactionStatus: string = task.variables.get("transactionStatus") || "timeout"; 
      const offerId: string = task.variables.get("offerId");
      const userId: string = task.variables.get("userId");
      logger.info(`Logging transaction with hash: ${transactionHash} and status: ${transactionStatus}`);
      // save into transaction supabase table
      const supabaseClient = createDirectServiceClient();
      const { data, error } = await supabaseClient
        .from("transactions")
        .insert([
          {
            hash: transactionHash,
            status: transactionStatus,
            offer_id: offerId,
            user_id: userId,
          },
        ]);
      taskService.complete(task);


    } catch (error) {
      logger.error("Error in logBuyOfferTransaction task:", error);
      if (error instanceof Error) {
        await taskService.handleBpmnError(
          task,
          "LOGGING_ERROR",
          `Logging transaction failed: ${error.message}`
        );
      }
    }
  }); 


