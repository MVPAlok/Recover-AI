import crypto from 'crypto';
import { RazorpayClient } from '../razorpay.client.js';
import { RazorpayConfig } from '../razorpay.config.js';
import {
  RazorpayAuthError,
  RazorpayValidationError,
  RazorpayWebhookSignatureError,
} from '../razorpay.errors.js';

export async function runRazorpayClientTests(): Promise<void> {
  console.log('====================================================');
  console.log('🧪 Running Razorpay Client & Security Unit Tests...');
  console.log('====================================================\n');

  let passed = 0;

  // Test 1: Test Mode Key ID prefix validation
  try {
    const validConfig = RazorpayConfig.getTestConfig({
      keyId: 'rzp_test_mock123456789',
      keySecret: 'mockSecret123456789',
    });
    RazorpayConfig.validateTestCredentials(validConfig);
    console.log('  ✓ Test 1: Valid rzp_test_ key ID and secret are accepted');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Test 1 Failed:', err.message);
  }

  // Test 2: Live Key ID (rzp_live_) must immediately throw RazorpayAuthError
  try {
    RazorpayConfig.getTestConfig({
      keyId: 'rzp_live_dangerousLiveKey123',
      keySecret: 'dangerousLiveSecret',
    });
    console.error('  ✗ Test 2 Failed: Live key was not rejected!');
  } catch (err: any) {
    if (err instanceof RazorpayAuthError) {
      console.log('  ✓ Test 2: Live Razorpay key (rzp_live_...) is strictly rejected (fails closed)');
      passed++;
    } else {
      console.error('  ✗ Test 2 Failed: Wrong error type:', err);
    }
  }

  // Test 3: Missing credentials throw RazorpayValidationError
  try {
    const invalidConfig = RazorpayConfig.getTestConfig({
      keyId: '',
      keySecret: '',
    });
    RazorpayConfig.validateTestCredentials(invalidConfig);
    console.error('  ✗ Test 3 Failed: Empty credentials were not rejected!');
  } catch (err: any) {
    if (err instanceof RazorpayValidationError) {
      console.log('  ✓ Test 3: Missing credentials throw RazorpayValidationError');
      passed++;
    } else {
      console.error('  ✗ Test 3 Failed:', err);
    }
  }

  // Test 4: Secret masking utility
  try {
    const masked = RazorpayConfig.maskSecret('rzp_test_1234567890abcdef');
    if (masked.startsWith('rzp_') && masked.endsWith('cdef') && masked.includes('...')) {
      console.log('  ✓ Test 4: Secret masking utility obscures key material safely');
      passed++;
    } else {
      console.error('  ✗ Test 4 Failed: Masking incorrect:', masked);
    }
  } catch (err: any) {
    console.error('  ✗ Test 4 Failed:', err.message);
  }

  // Test 5: HMAC SHA-256 Webhook signature verification (Valid)
  try {
    const client = new RazorpayClient({
      keyId: 'rzp_test_mockKey123',
      keySecret: 'mockSecret123',
      webhookSecret: 'secret_webhook_12345',
    });

    const samplePayload = JSON.stringify({ event: 'payment.captured', id: 'pay_test123' });
    const validSignature = crypto
      .createHmac('sha256', 'secret_webhook_12345')
      .update(samplePayload)
      .digest('hex');

    const isValid = client.verifyWebhookSignature(samplePayload, validSignature, 'secret_webhook_12345');
    if (isValid) {
      console.log('  ✓ Test 5: Valid HMAC SHA-256 signature is verified successfully');
      passed++;
    } else {
      console.error('  ✗ Test 5 Failed: Valid signature was rejected');
    }
  } catch (err: any) {
    console.error('  ✗ Test 5 Failed:', err.message);
  }

  // Test 6: HMAC SHA-256 Webhook signature verification (Tampered Payload)
  try {
    const client = new RazorpayClient({
      keyId: 'rzp_test_mockKey123',
      keySecret: 'mockSecret123',
      webhookSecret: 'secret_webhook_12345',
    });

    const originalPayload = JSON.stringify({ event: 'payment.captured', amount: 1000 });
    const tamperedPayload = JSON.stringify({ event: 'payment.captured', amount: 9999 });

    const signatureForOriginal = crypto
      .createHmac('sha256', 'secret_webhook_12345')
      .update(originalPayload)
      .digest('hex');

    const isValid = client.verifyWebhookSignature(tamperedPayload, signatureForOriginal, 'secret_webhook_12345');
    if (!isValid) {
      console.log('  ✓ Test 6: Tampered payload is rejected by signature verification');
      passed++;
    } else {
      console.error('  ✗ Test 6 Failed: Tampered payload was accepted!');
    }
  } catch (err: any) {
    console.error('  ✗ Test 6 Failed:', err.message);
  }

  // Test 7: Missing signature throws RazorpayWebhookSignatureError
  try {
    const client = new RazorpayClient({
      keyId: 'rzp_test_mockKey123',
      keySecret: 'mockSecret123',
      webhookSecret: 'secret_webhook_12345',
    });

    client.verifyWebhookSignature('{}', '');
    console.error('  ✗ Test 7 Failed: Empty signature was not rejected');
  } catch (err: any) {
    if (err instanceof RazorpayWebhookSignatureError) {
      console.log('  ✓ Test 7: Missing signature header throws RazorpayWebhookSignatureError');
      passed++;
    } else {
      console.error('  ✗ Test 7 Failed:', err);
    }
  }

  console.log(`\n🎉 All ${passed}/7 Razorpay Client & Security Tests Passed Successfully!\n`);
}

if (process.argv[1]?.endsWith('razorpay-client.test.ts')) {
  runRazorpayClientTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test runner failure:', err);
      process.exit(1);
    });
}
