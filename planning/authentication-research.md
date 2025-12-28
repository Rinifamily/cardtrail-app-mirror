# CardTrail Authentication Research

**Document Version:** 1.0  
**Last Updated:** December 5, 2025  
**Status:** Research Complete - Implementation Deferred  
**Author:** Architecture Team

---

## 📋 Overview

This document contains research findings for CardTrail's authentication system. Implementation is **deferred to a later phase** to prioritize core app functionality first.

### Development Strategy

**Current approach:**
1. Build core app features first (Search, Collection, Market, Rankings)
2. Use local storage for user data initially
3. Add authentication in a later phase
4. Migrate local data to cloud after auth is implemented

**Rationale:**
- Auth requires significant setup (SMS provider, WeChat platform, etc.)
- Core features can be developed and tested without auth
- Faster time-to-prototype
- Auth can be added as a non-breaking enhancement

---

## 🔐 Chosen Solution: Better Auth

### Why Better Auth?

| Feature | Better Auth | Supabase Auth | NextAuth |
|---------|-------------|---------------|----------|
| Phone Number OTP | ✅ Official Plugin | ⚠️ Limited | ❌ Community |
| WeChat OAuth | ✅ Generic OAuth | ⚠️ Custom | ⚠️ Custom |
| Type Safety | ✅ Full TypeScript | ✅ Good | ⚠️ Partial |
| Database Agnostic | ✅ Yes | ❌ Supabase only | ✅ Yes |
| Self-hosted | ✅ Yes | ❌ No | ✅ Yes |

### Better Auth Resources

- **Website:** https://www.better-auth.com
- **Documentation:** https://www.better-auth.com/docs
- **GitHub:** https://github.com/better-auth/better-auth
- **Phone Plugin:** https://www.better-auth.com/docs/plugins/phone-number

---

## 📱 Phone Number Authentication

### Plugin: `@better-auth/phone-number`

**Supported Features:**

| Feature | Description |
|---------|-------------|
| Send OTP | Send verification code to phone |
| Verify Phone | Verify phone number with OTP |
| Sign Up | Register with phone number |
| Sign In | Login with phone + OTP |
| Password Reset | Reset password via phone OTP |
| Update Phone | Change phone number with verification |

### Server Configuration

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { phoneNumber } from "better-auth/plugins";

export const auth = betterAuth({
  database: {
    // Supabase PostgreSQL connection
    type: "postgres",
    url: process.env.DATABASE_URL,
  },
  plugins: [
    phoneNumber({
      // SMS sending callback - implement with your SMS provider
      sendOTP: async ({ phoneNumber, code }) => {
        await sendSMS(phoneNumber, `您的验证码是：${code}，5分钟内有效。`);
      },
      // Allow signup via phone verification
      signUpOnVerification: true,
      // Generate temp email for phone-only users
      getTempEmail: (phone) => `${phone}@phone.cardtrail.app`,
      // OTP settings
      otpLength: 6,
      expiresIn: 300, // 5 minutes
    }),
  ],
});
```

### Client Configuration

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/client";
import { phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [phoneNumberClient()],
});

// Export typed hooks
export const { useSession, signIn, signOut } = authClient;
```

### Usage Examples

```typescript
// Send OTP
await authClient.phoneNumber.sendVerificationCode({
  phoneNumber: "+8613812345678",
});

// Verify and login
await authClient.phoneNumber.verify({
  phoneNumber: "+8613812345678",
  code: "123456",
});

// Sign in with phone + password
await authClient.signIn.phoneNumber({
  phoneNumber: "+8613812345678",
  password: "userpassword",
});
```

---

## 💬 SMS Service Providers

### Option A: Aliyun SMS (阿里云短信)

**Pros:**
- Reliable in China
- Good documentation
- Reasonable pricing

**Setup:**
1. Register at https://www.aliyun.com
2. Enable SMS service
3. Create signature (审核需要1-2工作日)
4. Create template (审核需要1-2工作日)

**Environment Variables:**
```env
ALIYUN_ACCESS_KEY_ID=your_access_key
ALIYUN_ACCESS_KEY_SECRET=your_secret
ALIYUN_SMS_SIGN_NAME=卡迹
ALIYUN_SMS_TEMPLATE_CODE=SMS_123456
```

**Implementation:**
```typescript
// lib/sms/aliyun.ts
import Dysmsapi from '@alicloud/dysmsapi20170525';
import * as OpenApi from '@alicloud/openapi-client';

const client = new Dysmsapi(new OpenApi.Config({
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  endpoint: 'dysmsapi.aliyuncs.com',
}));

export async function sendSMS(phoneNumber: string, code: string) {
  await client.sendSms({
    phoneNumbers: phoneNumber,
    signName: process.env.ALIYUN_SMS_SIGN_NAME,
    templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE,
    templateParam: JSON.stringify({ code }),
  });
}
```

### Option B: Tencent Cloud SMS (腾讯云短信)

**Pros:**
- WeChat ecosystem integration
- Easy to use with WeChat login

**Setup:**
1. Register at https://cloud.tencent.com
2. Enable SMS service
3. Create app, signature, and template

**Environment Variables:**
```env
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
TENCENT_SMS_SDK_APP_ID=1400000000
TENCENT_SMS_SIGN_NAME=卡迹
TENCENT_SMS_TEMPLATE_ID=123456
```

---

## 🔗 WeChat Login Integration

### Platform: WeChat Open Platform (微信开放平台)

**Setup Requirements:**
1. Register at https://open.weixin.qq.com
2. Create Mobile/Web application
3. Complete developer verification (企业认证)
4. Get AppID and AppSecret

### Better Auth Generic OAuth

```typescript
// lib/auth.ts
import { genericOAuth } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "wechat",
          clientId: process.env.WECHAT_APP_ID,
          clientSecret: process.env.WECHAT_APP_SECRET,
          authorizationUrl: "https://open.weixin.qq.com/connect/oauth2/authorize",
          tokenUrl: "https://api.weixin.qq.com/sns/oauth2/access_token",
          userInfoUrl: "https://api.weixin.qq.com/sns/userinfo",
          scopes: ["snsapi_userinfo"],
          // Custom profile mapping for WeChat
          mapProfileToUser: (profile) => ({
            id: profile.openid,
            name: profile.nickname,
            image: profile.headimgurl,
          }),
        },
      ],
    }),
  ],
});
```

### WeChat Environment Variables

```env
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_APP_SECRET=your_wechat_secret
```

---

## 🗄️ Database Schema

### Tables Created by Better Auth

```sql
-- User table (core)
CREATE TABLE "user" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_number TEXT UNIQUE,
  phone_number_verified BOOLEAN DEFAULT FALSE,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session table
CREATE TABLE "session" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Account table (OAuth providers)
CREATE TABLE "account" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(provider, provider_account_id)
);

-- Verification table (OTP codes)
CREATE TABLE "verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_phone ON "user"(phone_number);
CREATE INDEX idx_session_user ON "session"(user_id);
CREATE INDEX idx_account_user ON "account"(user_id);
CREATE INDEX idx_verification_identifier ON "verification"(identifier);
```

---

## 📁 Implementation File Structure

```
apps/web/
├── lib/
│   ├── auth.ts                 # Better Auth server config
│   ├── auth-client.ts          # Better Auth client
│   └── sms/
│       ├── index.ts            # SMS provider interface
│       ├── aliyun.ts           # Aliyun implementation
│       └── tencent.ts          # Tencent implementation
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...all]/
│   │           └── route.ts    # Better Auth API handler
│   ├── (auth)/
│   │   ├── layout.tsx          # Auth pages layout
│   │   ├── login/
│   │   │   └── page.tsx        # Login page
│   │   └── register/
│   │       └── page.tsx        # Register page
│   └── (protected)/
│       └── layout.tsx          # Protected routes layout
├── components/
│   └── auth/
│       ├── LoginForm.tsx       # Phone login form
│       ├── OTPInput.tsx        # 6-digit OTP input
│       ├── CountdownButton.tsx # Resend OTP button
│       └── UserMenu.tsx        # User dropdown menu
└── middleware.ts               # Auth middleware
```

---

## 🔜 Implementation Checklist

### Prerequisites (Before Starting)
- [ ] Choose SMS provider (Aliyun / Tencent)
- [ ] Register SMS account and complete verification
- [ ] Create SMS signature (审核)
- [ ] Create SMS template (审核)
- [ ] Get Supabase Database URL

### Phase Implementation
- [ ] Install Better Auth dependencies
- [ ] Configure database connection
- [ ] Set up Phone Number plugin
- [ ] Implement SMS provider integration
- [ ] Create auth API routes
- [ ] Build login/register UI
- [ ] Add protected route middleware
- [ ] Migrate local data to user accounts
- [ ] (Optional) Add WeChat login

---

## 📚 References

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Better Auth Phone Plugin](https://www.better-auth.com/docs/plugins/phone-number)
- [Better Auth Generic OAuth](https://www.better-auth.com/docs/plugins/generic-oauth)
- [Aliyun SMS Documentation](https://help.aliyun.com/document_detail/101414.html)
- [Tencent Cloud SMS Documentation](https://cloud.tencent.com/document/product/382)
- [WeChat Open Platform](https://open.weixin.qq.com/cgi-bin/showdocument?action=dir_list&t=resource/res_list&verify=1&id=open1419316505)

---

## ✏️ Revision History

| Date | Change | Author |
|------|--------|--------|
| 2025-12-05 | Initial research document | Architecture Team |

