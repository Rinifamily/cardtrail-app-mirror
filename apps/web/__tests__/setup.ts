import "@testing-library/jest-dom/vitest";

// Set default environment variables for tests
// These will be used unless real credentials are provided
process.env.EBAY_APP_ID = process.env.EBAY_APP_ID || 'test-app-id-for-unit-tests';
process.env.EBAY_ENVIRONMENT = process.env.EBAY_ENVIRONMENT || 'SANDBOX';
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
