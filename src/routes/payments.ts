import { Router, Request, Response } from 'express';
// @ts-expect-error iyzipay has no type declarations
import Iyzipay from 'iyzipay';
import { db } from '../db.js';
import { Logger } from '../lib/logger.js';
import { requireAuth } from '../middleware/auth.js';

export const paymentsRouter = Router();

const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY || 'sandbox-Key-Not-Provided',
  secretKey: process.env.IYZICO_SECRET_KEY || 'sandbox-Secret-Not-Provided',
  uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
});

/**
 * iyzico checkout form başlatır
 * POST /api/v1/payments/checkout
 */
paymentsRouter.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  const { packageId } = req.body;
  const userId = req.session.userId;

  if (!packageId) {
    res.status(400).json({ error: 'packageId zorunludur.' });
    return;
  }

  // Paket ve Abonelik tanımları
  const packages: Record<
    string,
    { name: string; price: string; credits: number; isSubscription?: boolean; planCode?: string }
  > = {
    basic: { name: 'Başlangıç Paketi (50 Kredi)', price: '100.00', credits: 50 },
    pro: { name: 'Profesyonel Paket (250 Kredi)', price: '450.00', credits: 250 },
    enterprise: { name: 'Kurumsal Paket (1000 Kredi)', price: '1500.00', credits: 1000 },
    sub_silver: {
      name: 'Gümüş Abonelik (Aylık 300 Kredi)',
      price: '299.00',
      credits: 300,
      isSubscription: true,
      planCode: process.env.IYZICO_PLAN_SILVER || 'sandbox-silver-plan',
    },
    sub_gold: {
      name: 'Altın Abonelik (Aylık 1000 Kredi)',
      price: '799.00',
      credits: 1000,
      isSubscription: true,
      planCode: process.env.IYZICO_PLAN_GOLD || 'sandbox-gold-plan',
    },
  };

  const selectedPkg = packages[packageId];
  if (!selectedPkg) {
    res.status(404).json({ error: 'Belirtilen paket bulunamadı.' });
    return;
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    const callbackUrl = process.env.PUBLIC_URL
      ? `${process.env.PUBLIC_URL}/api/v1/payments/webhook?userId=${userId}&credits=${selectedPkg.credits}&isSub=${selectedPkg.isSubscription ? 'true' : 'false'}`
      : `http://localhost:${process.env.PORT || 4000}/api/v1/payments/webhook?userId=${userId}&credits=${selectedPkg.credits}&isSub=${selectedPkg.isSubscription ? 'true' : 'false'}`;

    const ipAddress = req.ip || '127.0.0.1';

    if (selectedPkg.isSubscription) {
      // iyzico Abonelik (Subscription) Checkout Form Başlatma
      const subscriptionRequest = {
        locale: 'tr',
        conversationId: `conv_sub_${Date.now()}_${userId}`,
        callbackUrl: callbackUrl,
        pricingPlanCode: selectedPkg.planCode,
        subscriptionInitialStatus: 'ACTIVE',
        buyer: {
          id: String(user.id),
          name: user.username?.split('@')[0] || 'Kullanıcı',
          surname: 'Avcı',
          gsmNumber: '+905555555555',
          email: user.username || 'arda.avci@gmail.com',
          identityNumber: '11111111111',
          registrationAddress: 'İstanbul, Türkiye',
          ip: ipAddress,
          city: 'Istanbul',
          country: 'Turkey',
          zipCode: '34000',
        },
      };

      iyzipay.subscriptionCheckoutForm.initialize(subscriptionRequest, (err: any, result: any) => {
        if (err || result.status !== 'success') {
          Logger.error('iyzico subscription checkout form baslatma hatasi:', err || result);
          res
            .status(500)
            .json({ error: 'Abonelik formu başlatılamadı.', details: result?.errorMessage });
          return;
        }

        res.json({
          status: 'success',
          token: result.token,
          checkoutFormContent: result.checkoutFormContent,
          paymentPageUrl: null, // Abonelikte iFrame checkoutFormContent render edilir
        });
      });
    } else {
      // iyzico Tek Seferlik Checkout Form Başlatma
      const requestData = {
        locale: 'tr',
        conversationId: `conv_${Date.now()}_${userId}`,
        price: selectedPkg.price,
        paidPrice: selectedPkg.price,
        currency: 'TRY',
        basketId: `basket_${Date.now()}`,
        paymentChannel: 'WEB',
        paymentGroup: 'PRODUCT',
        callbackUrl: callbackUrl,
        buyer: {
          id: String(user.id),
          name: user.username?.split('@')[0] || 'Kullanıcı',
          surname: 'Avcı',
          gsmNumber: '+905555555555',
          email: user.username || 'arda.avci@gmail.com',
          identityNumber: '11111111111',
          lastLoginDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
          registrationDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
          registrationAddress: 'İstanbul, Türkiye',
          ip: ipAddress,
          city: 'Istanbul',
          country: 'Turkey',
          zipCode: '34000',
        },
        shippingAddress: {
          contactName: user.username?.split('@')[0] || 'Kullanıcı',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'İstanbul, Türkiye',
          zipCode: '34000',
        },
        billingAddress: {
          contactName: user.username?.split('@')[0] || 'Kullanıcı',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'İstanbul, Türkiye',
          zipCode: '34000',
        },
        basketItems: [
          {
            id: packageId,
            name: selectedPkg.name,
            category1: 'Credits',
            itemType: 'VIRTUAL',
            price: selectedPkg.price,
          },
        ],
      };

      iyzipay.checkoutFormInitialize.create(requestData, (err: any, result: any) => {
        if (err || result.status !== 'success') {
          Logger.error('iyzico checkout form baslatma hatasi:', err || result);
          res
            .status(500)
            .json({ error: 'Ödeme formu başlatılamadı.', details: result?.errorMessage });
          return;
        }

        res.json({
          status: 'success',
          token: result.token,
          checkoutFormContent: result.checkoutFormContent,
          paymentPageUrl: result.paymentPageUrl,
        });
      });
    }
  } catch (error: any) {
    Logger.error('Payments checkout error:', error);
    res.status(500).json({ error: 'Sistemsel bir hata oluştu.' });
  }
});

/**
 * Idempotency: aynı token'in iki kere işlenmesini engelle
 */
async function isTokenProcessed(token: string): Promise<boolean> {
  const existing = await db.get(
    "SELECT id FROM credit_transactions WHERE description LIKE ? LIMIT 1",
    [`%token:${token}%`],
  );
  if (existing) return true;
  const sub = await db.get('SELECT id FROM subscriptions WHERE iyzico_token = ? LIMIT 1', [token]);
  return !!sub;
}

/**
 * iyzico ödeme sonucu callback webhook rotası
 * POST /api/v1/payments/webhook
 */
paymentsRouter.post('/webhook', async (req: Request, res: Response) => {
  const token = req.body.token;
  const userId = Number(req.query.userId);
  const creditsToAdd = Number(req.query.credits);
  const isSub = req.query.isSub === 'true';

  if (!token || !userId || !creditsToAdd) {
    Logger.error('iyzico callback eksik parametreler:', { token, userId, creditsToAdd });
    res.status(400).send('Eksik parametreler');
    return;
  }

  try {
    // Idempotency kontrolü
    if (await isTokenProcessed(token)) {
      Logger.warn(`iyzico tekrar eden webhook engellendi: token=${token}, userId=${userId}`);
      res.redirect('/?payment=success');
      return;
    }

    if (isSub) {
      // Abonelik durumunu doğrula
      iyzipay.subscriptionCheckoutForm.retrieve(
        {
          locale: 'tr',
          conversationId: `conv_sub_verify_${Date.now()}_${userId}`,
          token: token,
        },
        async (err: any, result: any) => {
          if (err || result.status !== 'success' || result.subscriptionStatus !== 'ACTIVE') {
            Logger.error('iyzico abonelik dogrulama basarisiz:', err || result);
            res.redirect('/?payment=failed');
            return;
          }

          const dbUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
          if (!dbUser) {
            Logger.error('iyzico abonelik basarili ancak kullanıcı bulunamadı:', { userId });
            res.redirect('/?payment=user_not_found');
            return;
          }

          const subRef = result.subscriptionReferenceCode || result.referenceCode || '';
          const nextBilling = result.endDate || null;

          // Kredi ve Abonelik Kaydı
          const newCredits = (dbUser.credits || 0) + creditsToAdd;
          await db.run(
            'UPDATE users SET credits = ?, monthly_credit_limit = ?, credit_reset_date = CURRENT_TIMESTAMP WHERE id = ?',
            [newCredits, creditsToAdd, userId],
          );

          await db.run(
            `INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)`,
            [
              userId,
              creditsToAdd,
              'subscription',
              `iyzico Abonelik (${creditsToAdd} kredi/ay) başlatıldı. token:${token}`,
            ],
          );

          // subscriptions tablosuna kaydet (upsert)
          await db.run(
            `INSERT INTO subscriptions (user_id, plan, status, iyzico_token, iyzico_subscription_reference, next_billing_date)
             VALUES (?, ?, 'active', ?, ?, ?)
             ON CONFLICT (user_id) DO UPDATE SET
               plan = EXCLUDED.plan,
               status = 'active',
               iyzico_token = EXCLUDED.iyzico_token,
               iyzico_subscription_reference = EXCLUDED.iyzico_subscription_reference,
               next_billing_date = EXCLUDED.next_billing_date,
               cancelled_at = NULL`,
            [userId, result.pricingPlanCode || 'sub_silver', token, subRef, nextBilling],
          );

          Logger.info(
            `Abonelik başarıyla başlatıldı: userId=${userId}, credits=+${creditsToAdd}, ref=${subRef}`,
          );
          res.redirect('/?payment=success');
        },
      );
    } else {
      // Tek seferlik ödeme durumunu sorgula
      iyzipay.checkoutForm.retrieve(
        {
          locale: 'tr',
          conversationId: `conv_verify_${Date.now()}_${userId}`,
          token: token,
        },
        async (err: any, result: any) => {
          if (err || result.status !== 'success' || result.paymentStatus !== 'SUCCESS') {
            Logger.error('iyzico odeme dogrulama basarisiz:', err || result);
            res.redirect('/?payment=failed');
            return;
          }

          const dbUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
          if (!dbUser) {
            Logger.error('iyzico odeme basarili ancak kullanıcı bulunamadı:', { userId });
            res.redirect('/?payment=user_not_found');
            return;
          }

          const newCredits = (dbUser.credits || 0) + creditsToAdd;
          await db.run('UPDATE users SET credits = ? WHERE id = ?', [newCredits, userId]);

          await db.run(
            `INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)`,
            [
              userId,
              creditsToAdd,
              'purchase',
              `iyzico sanal POS ile ${creditsToAdd} kredi satın alındı. token:${token}`,
            ],
          );

          Logger.info(
            `Tek seferlik ödeme başarılı: userId=${userId}, credits=+${creditsToAdd}`,
          );
          res.redirect('/?payment=success');
        },
      );
    }
  } catch (error: any) {
    Logger.error('iyzico webhook hatası:', error);
    res.redirect('/?payment=error');
  }
});
