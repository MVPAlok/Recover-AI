import { PrismaClient, TransactionStatus } from '@prisma/client';
import { SeededRandom } from './utils/random.js';
import { generateMerchants } from './generators/merchant.generator.js';
import { generateCustomers } from './generators/customer.generator.js';
import { generateAllTransactions } from './generators/transaction.generator.js';
import { RecoveryScenarioType } from './utils/distributions.js';

const prisma = new PrismaClient();

interface SeedOptions {
  transactionCount: number;
  seed: number;
  merchantCount: number;
  customerCount: number;
  clean: boolean;
}

function parseArgs(): SeedOptions {
  const args = process.argv.slice(2);
  let transactionCount = 1000;
  let seed = 42;
  let merchantCount = 2;
  let customerCount = 100;
  let clean = true;

  for (const arg of args) {
    if (arg.startsWith('--transactions=')) {
      transactionCount = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('-n=')) {
      transactionCount = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--seed=')) {
      seed = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--merchants=')) {
      merchantCount = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--customers=')) {
      customerCount = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--no-clean' || arg === '--clean=false') {
      clean = false;
    }
  }

  // Scale customer count proportionally if transactions are large
  if (transactionCount > 1000 && customerCount === 100) {
    customerCount = Math.max(100, Math.floor(transactionCount / 10));
  }

  return {
    transactionCount,
    seed,
    merchantCount,
    customerCount,
    clean,
  };
}

async function validateInsertedData(expectedTransactionCount: number) {
  console.log('\n🔍 Running Post-Seed Data Integrity & Validation Checks...');

  const [
    merchants,
    customers,
    transactions,
    failedTransactionsWithNoCode,
    successWithCode,
    negativeAmounts,
    negativeRetries,
  ] = await Promise.all([
    prisma.merchant.findMany(),
    prisma.customer.findMany(),
    prisma.transaction.findMany(),
    prisma.transaction.count({
      where: {
        status: TransactionStatus.FAILED,
        OR: [{ failureCode: null }, { failureReason: null }],
      },
    }),
    prisma.transaction.count({
      where: {
        status: { in: [TransactionStatus.SUCCESS, TransactionStatus.PENDING] },
        OR: [{ failureCode: { not: null } }, { failureReason: { not: null } }],
      },
    }),
    prisma.transaction.count({
      where: {
        amount: { lte: 0 },
      },
    }),
    prisma.transaction.count({
      where: {
        retryCount: { lt: 0 },
      },
    }),
  ]);

  const merchantIds = new Set(merchants.map((m) => m.id));
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  // 1. Transaction count check
  if (transactions.length !== expectedTransactionCount) {
    throw new Error(
      `Validation Failed: Expected ${expectedTransactionCount} transactions, found ${transactions.length}`
    );
  }

  // 2. Orphan check
  for (const cust of customers) {
    if (!merchantIds.has(cust.merchantId)) {
      throw new Error(`Validation Failed: Orphan customer found ${cust.id}`);
    }
  }

  // 3. Transaction relationships check
  for (const tx of transactions) {
    const parentCustomer = customerMap.get(tx.customerId);
    if (!parentCustomer) {
      throw new Error(`Validation Failed: Orphan transaction found ${tx.id}`);
    }
    if (parentCustomer.merchantId !== tx.merchantId) {
      throw new Error(
        `Validation Failed: Transaction ${tx.id} merchantId mismatch with customer ${tx.customerId}`
      );
    }
  }

  // 4. Status and Failure codes rules
  if (failedTransactionsWithNoCode > 0) {
    throw new Error(
      `Validation Failed: Found ${failedTransactionsWithNoCode} FAILED transactions missing failureCode or failureReason`
    );
  }
  if (successWithCode > 0) {
    throw new Error(
      `Validation Failed: Found ${successWithCode} SUCCESS/PENDING transactions with non-null failureCode`
    );
  }

  // 5. Value constraints
  if (negativeAmounts > 0) {
    throw new Error(`Validation Failed: Found ${negativeAmounts} transactions with non-positive amount`);
  }
  if (negativeRetries > 0) {
    throw new Error(`Validation Failed: Found ${negativeRetries} transactions with negative retryCount`);
  }

  // 6. Email uniqueness per merchant
  const merchantEmailPairs = new Set<string>();
  for (const cust of customers) {
    const key = `${cust.merchantId}::${cust.email}`;
    if (merchantEmailPairs.has(key)) {
      throw new Error(`Validation Failed: Duplicate customer email within merchant: ${cust.email}`);
    }
    merchantEmailPairs.add(key);
  }

  console.log('✅ All post-seed integrity validation checks passed successfully!');
}

async function seed() {
  const options = parseArgs();
  const startTime = Date.now();

  console.log('====================================================');
  console.log('🚀 RecoverAI Synthetic Transaction Data Engine');
  console.log('====================================================');
  console.log(`Parameters:`);
  console.log(`  - Target Transactions : ${options.transactionCount}`);
  console.log(`  - Seed (Mulberry32)   : ${options.seed}`);
  console.log(`  - Merchants           : ${options.merchantCount}`);
  console.log(`  - Target Customers    : ${options.customerCount}`);
  console.log(`  - Clean Prior Data    : ${options.clean}`);
  console.log('----------------------------------------------------');

  const rng = new SeededRandom(options.seed);
  const baseDate = new Date();

  if (options.clean) {
    console.log('🧹 Cleaning existing database records...');
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.recoveryAttempt.deleteMany(),
      prisma.aIDecision.deleteMany(),
      prisma.transaction.deleteMany(),
      prisma.customer.deleteMany(),
      prisma.merchant.deleteMany(),
    ]);
    console.log('✨ Clean complete.');
  }

  // 1. Generate Merchants
  console.log(`\n🏢 Generating ${options.merchantCount} merchants...`);
  const merchants = generateMerchants(options.merchantCount, rng, baseDate);
  await prisma.merchant.createMany({
    data: merchants,
  });
  console.log(`  ✓ Inserted ${merchants.length} merchants.`);

  // 2. Generate Customers
  console.log(`\n👥 Generating ${options.customerCount} customers with behavioral profiles...`);
  const customers = generateCustomers(merchants, options.customerCount, rng, baseDate);
  
  // Insert customers in chunks
  const customerChunks: (typeof customers)[] = [];
  const chunkSize = 500;
  for (let i = 0; i < customers.length; i += chunkSize) {
    customerChunks.push(customers.slice(i, i + chunkSize));
  }

  for (const chunk of customerChunks) {
    await prisma.customer.createMany({
      data: chunk.map((c) => ({
        id: c.id,
        merchantId: c.merchantId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  }
  console.log(`  ✓ Inserted ${customers.length} customers across ${merchants.length} merchants.`);

  // 3. Generate Transactions & Scenarios
  console.log(`\n💳 Generating ${options.transactionCount} transactions & recovery scenarios...`);
  const { transactions, scenarioCounts } = generateAllTransactions(
    customers,
    options.transactionCount,
    rng,
    baseDate
  );

  // Insert transactions in chunks
  const txChunkSize = 500;
  for (let i = 0; i < transactions.length; i += txChunkSize) {
    const chunk = transactions.slice(i, i + txChunkSize);
    await prisma.transaction.createMany({
      data: chunk.map((t) => ({
        id: t.id,
        merchantId: t.merchantId,
        customerId: t.customerId,
        amount: t.amount,
        currency: t.currency,
        status: t.status as TransactionStatus,
        paymentMethod: t.paymentMethod,
        failureCode: t.failureCode,
        failureReason: t.failureReason,
        retryCount: t.retryCount,
        razorpayPaymentId: t.razorpayPaymentId,
        razorpayOrderId: t.razorpayOrderId,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  }
  console.log(`  ✓ Inserted ${transactions.length} transactions.`);

  // 4. Run Validation
  await validateInsertedData(options.transactionCount);

  // 5. Calculate & Print Detailed Summary
  const [statusCounts, failureGroup, totalVolume] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.transaction.groupBy({
      by: ['failureCode'],
      where: { status: TransactionStatus.FAILED },
      _count: { id: true },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
    }),
  ]);

  const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.id]));
  const successCount = statusMap[TransactionStatus.SUCCESS] || 0;
  const failedCount = statusMap[TransactionStatus.FAILED] || 0;
  const pendingCount = statusMap[TransactionStatus.PENDING] || 0;

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n====================================================');
  console.log('📊 RecoverAI Data Seed Complete');
  console.log('====================================================');
  console.log(`Execution Time       : ${durationSec}s`);
  console.log(`Total Transactions   : ${transactions.length}`);
  console.log(`Total Customers      : ${customers.length}`);
  console.log(`Total Merchants      : ${merchants.length}`);
  console.log(`Total Volume (INR)   : ₹${(totalVolume._sum.amount || 0).toLocaleString('en-IN')}`);
  console.log('----------------------------------------------------');
  console.log('Transaction Status Breakdown:');
  console.log(`  - SUCCESS          : ${successCount} (${((successCount / transactions.length) * 100).toFixed(1)}%)`);
  console.log(`  - FAILED           : ${failedCount} (${((failedCount / transactions.length) * 100).toFixed(1)}%)`);
  console.log(`  - PENDING          : ${pendingCount} (${((pendingCount / transactions.length) * 100).toFixed(1)}%)`);
  console.log('----------------------------------------------------');
  console.log('Failure Codes Breakdown (FAILED Transactions):');
  for (const fg of failureGroup) {
    if (fg.failureCode) {
      console.log(`  - ${fg.failureCode.padEnd(25)} : ${fg._count.id}`);
    }
  }
  console.log('----------------------------------------------------');
  console.log('Injected Recovery-Oriented Evaluation Scenarios:');
  console.log(`  - Scenario A (Strong Customer + Bank Timeout)   : ${scenarioCounts[RecoveryScenarioType.SCENARIO_A_STRONG_CUSTOMER_TEMP_FAILURE]}`);
  console.log(`  - Scenario B (Repeat Failure + Insuff. Funds)   : ${scenarioCounts[RecoveryScenarioType.SCENARIO_B_REPEATED_FAILURE_INSUFFICIENT_FUNDS]}`);
  console.log(`  - Scenario C (Authentication / OTP Failure)     : ${scenarioCounts[RecoveryScenarioType.SCENARIO_C_AUTHENTICATION_FAILURE]}`);
  console.log(`  - Scenario D (Gateway Timeout)                 : ${scenarioCounts[RecoveryScenarioType.SCENARIO_D_GATEWAY_TIMEOUT]}`);
  console.log(`  - Scenario E (Repeated Retry Limit)            : ${scenarioCounts[RecoveryScenarioType.SCENARIO_E_REPEATED_RETRY_LIMIT]}`);
  console.log('====================================================\n');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding process encountered an error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
