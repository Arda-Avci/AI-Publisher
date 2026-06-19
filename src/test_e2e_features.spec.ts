import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { initDatabase, db } from './db.js';
import { encryptUsername } from './lib/crypto.js';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs-extra';
