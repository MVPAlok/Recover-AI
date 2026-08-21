import { SeededRandom } from '../utils/random.js';

export interface GeneratedMerchant {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const MERCHANT_PRESETS = [
  {
    name: 'Apex Retail Hub',
    domain: 'apexretail.example.test',
  },
  {
    name: 'CloudScale SaaS Platform',
    domain: 'cloudscale.example.test',
  },
  {
    name: 'Zenith Direct Commerce',
    domain: 'zenithcommerce.example.test',
  },
  {
    name: 'Bharat HyperStore',
    domain: 'bharathypershop.example.test',
  },
  {
    name: 'NovaTech Digital Subscriptions',
    domain: 'novatech.example.test',
  },
];

export function generateMerchants(
  count: number,
  rng: SeededRandom,
  baseDate: Date
): GeneratedMerchant[] {
  const selectedPresets = MERCHANT_PRESETS.slice(0, Math.min(count, MERCHANT_PRESETS.length));
  
  // If count > presets, generate extra numbered merchants
  while (selectedPresets.length < count) {
    const idx = selectedPresets.length + 1;
    selectedPresets.push({
      name: `Merchant Corp ${idx}`,
      domain: `merchant${idx}.example.test`,
    });
  }

  return selectedPresets.map((preset, index) => {
    // Stagger merchant creation dates 60 to 90 days prior to baseDate
    const daysAgo = 60 + index * 10;
    const createdAt = new Date(baseDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(createdAt.getTime() + 1000 * 60 * 60 * 24);

    return {
      id: `mcht_${(index + 1).toString().padStart(4, '0')}_${rng.nextInt(10000, 99999)}`,
      name: preset.name,
      email: `billing@${preset.domain}`,
      createdAt,
      updatedAt,
    };
  });
}
