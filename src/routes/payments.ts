import { Router, Request, Response } from 'express';
// @ts-ignore
import Iyzipay from 'iyzipay';
import { db } from '../db.js';
import { CreditService } from '../services/creditService.js';
import { Logger } from '../lib/logger.js';
import { requireAuth } from '../middleware/auth.js';

export const paymentsRouter = Router();

const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY || 'sandbox-Key-Not-Provided',
  secretKey: process.env.IYZICO_SECRET_KEY || 'sandbox-Secret-Not-Provided',
  uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'
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
  const packages: Record<string, { name: string; price: string; credits: number; isSubscription?: boolean; planCode?: string }> = {
    basic: { name: 'Başlangıç Paketi (50 Kredi)', price: '100.00', credits: 50 },
    pro: { name: 'Profesyonel Paket (250 Kredi)', price: '450.00', credits: 250 },
    enterprise: { name: 'Kurumsal Paket (1000 Kredi)', price: '1500.00', credits: 1000 },
    sub_silver: { name: 'Gümüş Abonelik (Aylık 300 Kredi)', price: '299.00', credits: 300, isSubscription: true, planCode: process.env.IYZICO_PLAN_SILVER || 'sandbox-silver-plan' },
    sub_gold: { name: 'Altın Abonelik (Aylık 1000 Kredi)', price: '799.00', credits: 1000, isSubscription: true, planCode: process.env.IYZICO_PLAN_GOLD || 'sandbox-gold-plan' }
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
      : `http://localhost:3010/api/v1/payments/webhook?userId=${userId}&credits=${selectedPkg.credits}&isSub=${selectedPkg.isSubscription ? 'true' : 'false'}`;

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
          zipCode: '34000'
        }
      };

      iyzipay.subscriptionCheckoutForm.initialize(subscriptionRequest, (err: any, result: any) => {
        if (err || result.status !== 'success') {
          Logger.error('iyzico subscription checkout form baslatma hatasi:', err || result);
          res.status(500).json({ error: 'Abonelik formu başlatılamadı.', details: result?.errorMessage });
          return;
        }

        res.json({
          status: 'success',
          token: result.token,
          checkoutFormContent: result.checkoutFormContent,
          paymentPageUrl: null // Abonelikte iFrame checkoutFormContent render edilir
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
          zipCode: '34000'
        },
        shippingAddress: {
          contactName: user.username?.split('@')[0] || 'Kullanıcı',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'İstanbul, Türkiye',
          zipCode: '34000'
        },
        billingAddress: {
          contactName: user.username?.split('@')[0] || 'Kullanıcı',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'İstanbul, Türkiye',
          zipCode: '34000'
        },
        basketItems: [
          {
            id: packageId,
            name: selectedPkg.name,
            category1: 'Credits',
            itemType: 'VIRTUAL',
            price: selectedPkg.price
          }
        ]
      };

      iyzipay.checkoutFormInitialize.create(requestData, (err: any, result: any) => {
        if (err || result.status !== 'success') {
          Logger.error('iyzico checkout form baslatma hatasi:', err || result);
          res.status(500).json({ error: 'Ödeme formu başlatılamadı.', details: result?.errorMessage });
          return;
        }

        res.json({
          status: 'success',
          token: result.token,
          checkoutFormContent: result.checkoutFormContent,
          paymentPageUrl: result.paymentPageUrl
        });
      });
    }
  } catch (error: any) {
    Logger.error('Payments checkout error:', error);
    res.status(500).json({ error: 'Sistemsel bir hata oluştu.' });
  }
});

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
    if (isSub) {
      // Abonelik durumunu doğrula
      iyzipay.subscriptionCheckoutForm.retrieve({
        locale: 'tr',
        conversationId: `conv_sub_verify_${Date.now()}`,
        token: token
      }, async (err: any, result: any) => {
        if (err || result.status !== 'success' || result.subscriptionStatus !== 'ACTIVE') {
          Logger.error('iyzico abonelik dogrulama basarisiz:', err || result);
          res.redirect('/?payment=failed');
          return;
        }

        // Kredi ve Abonelik Kaydı
        const dbUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!dbUser) {
          Logger.error('iyzico abonelik basarili ancak kullanıcı bulunamadı:', { userId });
          res.redirect('/?payment=user_not_found');
          return;
        }

        const newCredits = (dbUser.credits || 0) + creditsToAdd;
        await db.run(
          'UPDATE users SET credits = ?, monthly_credit_limit = ?, credit_reset_date = CURRENT_TIMESTAMP WHERE id = ?',
          [newCredits, creditsToAdd, userId]
        );

        await db.run(
          'INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
          [userId, creditsToAdd, 'subscription', `iyzico Abonelik (${creditsToAdd} kredi/ay) başlatıldı.`]
        );

        Logger.info(`Kullanıcıya abonelik sonrası kredi yüklendi: userId=${userId}, credits=+${creditsToAdd}`);
        res.redirect('/?payment=success');
      });
    } else {
      // Tek seferlik ödeme durumunu sorgula
      iyzipay.checkoutForm.retrieve({
        locale: 'tr',
        conversationId: `conv_verify_${Date.now()}`,
        token: token
      }, async (err: any, result: any) => {
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
          'INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
          [userId, creditsToAdd, 'purchase', `iyzico sanal POS ile ${creditsToAdd} kredi satın alındı.`]
        );

        Logger.info(`Kullanıcıya ödeme sonrası kredi başarıyla yüklendi: userId=${userId}, credits=+${creditsToAdd}`);
        res.redirect('/?payment=success');
      });
    }
  } catch (error: any) {
    Logger.error('iyzico webhook hatası:', error);
    res.redirect('/?payment=error');
  }
});
