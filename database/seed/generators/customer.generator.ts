import { SeededRandom } from '../utils/random.js';
import {
  CUSTOMER_PROFILES,
  CustomerProfileConfig,
  CustomerProfileType,
} from '../utils/distributions.js';
import { GeneratedMerchant } from './merchant.generator.js';

export interface GeneratedCustomer {
  id: string;
  merchantId: string;
  name: string;
  email: string;
  phone: string;
  profile: CustomerProfileConfig;
  createdAt: Date;
  updatedAt: Date;
}

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Kabir', 'Rohan',
  'Dhruv', 'Ananya', 'Diya', 'Gauri', 'Isha', 'Kavya', 'Khushi', 'Myra',
  'Navya', 'Pooja', 'Priya', 'Riya', 'Saanvi', 'Tanvi', 'Anushka', 'Meera'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Iyer', 'Menon', 'Reddy', 'Nair', 'Rao',
  'Gupta', 'Mehta', 'Joshi', 'Bhat', 'Deshmukh', 'Chakraborty', 'Banerjee', 'Singh',
  'Kumar', 'Kulkarni', 'Malhotra', 'Kapoor', 'Saxena', 'Choudhury', 'Pandey', 'Mishra'
];

export function generateCustomers(
  merchants: GeneratedMerchant[],
  totalCustomerCount: number,
  rng: SeededRandom,
  baseDate: Date
): GeneratedCustomer[] {
  const customers: GeneratedCustomer[] = [];
  const customersPerMerchant = Math.ceil(totalCustomerCount / merchants.length);

  let globalCustomerIndex = 1;

  for (const merchant of merchants) {
    const merchantCreatedAt = merchant.createdAt.getTime();
    const nowTime = baseDate.getTime();

    // Map to keep track of emails generated for this merchant
    const usedEmails = new Set<string>();

    for (let i = 0; i < customersPerMerchant; i++) {
      if (customers.length >= totalCustomerCount) break;

      const profileWeights = CUSTOMER_PROFILES.map((p) => p.weight);
      const profile = rng.weightedChoice(CUSTOMER_PROFILES, profileWeights);

      const firstName = rng.choice(FIRST_NAMES);
      const lastName = rng.choice(LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;

      // Generate unique synthetic email per merchant
      let emailHandle = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${globalCustomerIndex}`;
      let email = `${emailHandle}@example.test`;
      while (usedEmails.has(email)) {
        email = `${emailHandle}.${rng.nextInt(100, 999)}@example.test`;
      }
      usedEmails.add(email);

      // Deterministic synthetic phone in +91 98XXX XXXXX format
      const phoneDigits = (10000000 + globalCustomerIndex).toString().padStart(8, '0');
      const phone = `+9198${phoneDigits}`;

      // Customer account creation date: between merchant creation and 15 days ago
      const minCustDate = merchantCreatedAt + 24 * 60 * 60 * 1000;
      const maxCustDate = nowTime - 15 * 24 * 60 * 60 * 1000;
      const custCreatedTime = minCustDate + rng.next() * (maxCustDate - minCustDate);
      const createdAt = new Date(custCreatedTime);
      const updatedAt = new Date(createdAt.getTime() + 1000 * 60 * 60 * 2);

      customers.push({
        id: `cust_${globalCustomerIndex.toString().padStart(5, '0')}_${rng.nextInt(10000, 99999)}`,
        merchantId: merchant.id,
        name: fullName,
        email,
        phone,
        profile,
        createdAt,
        updatedAt,
      });

      globalCustomerIndex++;
    }
  }

  return customers;
}
