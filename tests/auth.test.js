process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
const { registerUser, verifyEmail, loginUser } = require('../controllers/authController');
const User = require('../models/User');

jest.mock('../models/User');
jest.mock('../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' })
}));

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
};

describe('Auth controller (unit)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('register -> verify -> login (mocked)', async () => {
    const email = `unit${Date.now()}@example.com`;
    const password = 'secret123';
    const name = 'UnitTester';

    // Mock User.findOne to return null (no existing user)
    User.findOne.mockResolvedValue(null);

    // Mock User.create to return an object with save()
    const createdUser = {
      _id: 'fakeid',
      name,
      email,
      password,
      isVerified: false,
      save: jest.fn().mockResolvedValue(true)
    };
    User.create.mockResolvedValue(createdUser);

    const reqReg = { body: { name, email, password }, protocol: 'http', get: () => 'localhost:5000' };
    const resReg = makeRes();
    await registerUser(reqReg, resReg);
    expect(resReg.status).toHaveBeenCalledWith(201);
    const regData = resReg.json.mock.calls[0][0];
    expect(regData.success).toBe(true);

    // For verification: simulate an OTP and its stored hash
    const otp = '123456';
    const crypto = require('crypto');
    const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');

    // Mock User.findOne for verification (find by email)
    const userForVerify = {
      _id: 'fakeid',
      email,
      verificationTokenExpires: Date.now() + 100000,
      verificationTokenHash: otpHash,
      isVerified: false,
      save: jest.fn().mockResolvedValue(true)
    };
    User.findOne.mockResolvedValueOnce(userForVerify);

    const reqVer = { body: { email, otp } };
    const resVer = makeRes();
    await verifyEmail(reqVer, resVer);
    expect(resVer.status).toHaveBeenCalledWith(200);

    // Mock User.findOne for login to return a user with matchPassword
    const userForLogin = {
      _id: 'fakeid',
      name,
      email,
      isVerified: true,
      matchPassword: jest.fn().mockResolvedValue(true)
    };
    User.findOne.mockResolvedValueOnce(userForLogin);

    const reqLogin = { body: { email, password } };
    const resLogin = makeRes();
    await loginUser(reqLogin, resLogin);
    expect(resLogin.status).toHaveBeenCalledWith(200);
    expect(resLogin.cookie).toHaveBeenCalled();
    const loginData = resLogin.json.mock.calls[0][0];
    expect(loginData.success).toBe(true);
    // Token is set as HttpOnly cookie; response body contains user data
    expect(loginData.data.email).toBe(email);
  });
});
