// notification.service 테스트
// initNotificationMailer(), sendBookingNotice() 커버리지

import nodemailer from 'nodemailer';
import { initNotificationMailer, sendBookingNotice, NoticeData } from '../services/notification.service';

jest.mock('nodemailer');

const mockSendMail = jest.fn();
const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

const sampleData: NoticeData = {
  to: 'customer@test.com',
  name_kr: '김고객',
  name_en: 'KIM GOCHAEK',
  pnr: 'ABC123',
  airline: 'KE',
  flight_number: '001',
  route_from: 'ICN',
  route_to: 'NRT',
  departure_date: '2026-04-01',
  seat_number: '12A',
  passport_number: 'M12345678',
};

// ---------------------------------------------------------------------------
// sendBookingNotice — transporter not initialized (must run FIRST)
// The module-level `transporter` starts as null when the module is first
// imported. These tests must run before any describe block sets a transporter.
// ---------------------------------------------------------------------------
describe('notification.service - sendBookingNotice without transporter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedNodemailer.createTransport.mockReturnValue({
      sendMail: mockSendMail,
    } as any);
  });

  it('should return success:false with Korean error message when transporter is null', async () => {
    // transporter is null at module load — no initNotificationMailer called yet
    const result = await sendBookingNotice(sampleData);
    expect(result.success).toBe(false);
    expect(result.error).toBe('이메일 설정이 되어 있지 않습니다.');
  });
});

// ---------------------------------------------------------------------------
// initNotificationMailer
// ---------------------------------------------------------------------------
describe('notification.service - initNotificationMailer', () => {
  const origEmail = process.env.NOTIFY_EMAIL;
  const origPass = process.env.NOTIFY_EMAIL_PASS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedNodemailer.createTransport.mockReturnValue({
      sendMail: mockSendMail,
    } as any);
  });

  afterEach(() => {
    if (origEmail === undefined) delete process.env.NOTIFY_EMAIL;
    else process.env.NOTIFY_EMAIL = origEmail;
    if (origPass === undefined) delete process.env.NOTIFY_EMAIL_PASS;
    else process.env.NOTIFY_EMAIL_PASS = origPass;
  });

  it('should not create transporter when NOTIFY_EMAIL is missing', () => {
    delete process.env.NOTIFY_EMAIL;
    delete process.env.NOTIFY_EMAIL_PASS;
    initNotificationMailer();
    expect(mockedNodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('should not create transporter when NOTIFY_EMAIL_PASS is missing', () => {
    process.env.NOTIFY_EMAIL = 'notify@test.com';
    delete process.env.NOTIFY_EMAIL_PASS;
    initNotificationMailer();
    expect(mockedNodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('should create gmail transporter when both env vars are set', () => {
    process.env.NOTIFY_EMAIL = 'notify@test.com';
    process.env.NOTIFY_EMAIL_PASS = 'secret';
    initNotificationMailer();
    expect(mockedNodemailer.createTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: { user: 'notify@test.com', pass: 'secret' },
    });
  });
});

// ---------------------------------------------------------------------------
// sendBookingNotice — with transporter initialized
// ---------------------------------------------------------------------------
describe('notification.service - sendBookingNotice with transporter', () => {
  const origEmail = process.env.NOTIFY_EMAIL;
  const origPass = process.env.NOTIFY_EMAIL_PASS;

  beforeAll(() => {
    // Set transporter once for all tests in this describe
    mockedNodemailer.createTransport.mockReturnValue({
      sendMail: mockSendMail,
    } as any);
    process.env.NOTIFY_EMAIL = 'notify@test.com';
    process.env.NOTIFY_EMAIL_PASS = 'secret';
    initNotificationMailer();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-attach sendMail mock after clearAllMocks (createTransport mock is already consumed)
    mockSendMail.mockReset();
  });

  afterAll(() => {
    if (origEmail === undefined) delete process.env.NOTIFY_EMAIL;
    else process.env.NOTIFY_EMAIL = origEmail;
    if (origPass === undefined) delete process.env.NOTIFY_EMAIL_PASS;
    else process.env.NOTIFY_EMAIL_PASS = origPass;
  });

  it('should return success:true when sendMail resolves', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'ok' });
    const result = await sendBookingNotice(sampleData);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should call sendMail with correct to/subject', async () => {
    mockSendMail.mockResolvedValueOnce({});
    await sendBookingNotice(sampleData);

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const arg = mockSendMail.mock.calls[0][0];
    expect(arg.to).toBe('customer@test.com');
    expect(arg.subject).toContain('ABC123');
    expect(arg.subject).toContain('김고객');
  });

  it('should include masked passport number in HTML body', async () => {
    mockSendMail.mockResolvedValueOnce({});
    await sendBookingNotice(sampleData);

    const html: string = mockSendMail.mock.calls[0][0].html;
    // Passport M12345678 → first 2 chars + *** + last 2 chars = M1***78
    expect(html).toContain('M1***78');
    expect(html).not.toContain('M12345678');
  });

  it('should show "미배정" when seat_number is empty', async () => {
    mockSendMail.mockResolvedValueOnce({});
    await sendBookingNotice({ ...sampleData, seat_number: '' });

    const html: string = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('미배정');
  });

  it('should show "-" when passport_number is empty', async () => {
    mockSendMail.mockResolvedValueOnce({});
    await sendBookingNotice({ ...sampleData, passport_number: '' });

    const html: string = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('>-<');
  });

  it('should return success:false with error message when sendMail rejects', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP timeout'));
    const result = await sendBookingNotice(sampleData);
    expect(result.success).toBe(false);
    expect(result.error).toBe('SMTP timeout');
  });

  it('should return success:false with stringified error for non-Error throws', async () => {
    mockSendMail.mockRejectedValueOnce('string error');
    const result = await sendBookingNotice(sampleData);
    expect(result.success).toBe(false);
    expect(result.error).toBe('string error');
  });
});
