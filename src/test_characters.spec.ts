import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { initDatabase, db } from './db.js';
import { paymentsRouter } from './routes/payments.js';
import { encryptUsername } from './lib/crypto.js';
import { CreditService } from './services/creditService.js';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

// axios çağrılarını mock'layalım
