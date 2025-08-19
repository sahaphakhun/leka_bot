const sendMailMock = jest.fn().mockResolvedValue(undefined);

jest.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: sendMailMock
  })
}));

const pushMessageMock = jest.fn().mockResolvedValue(undefined);
jest.mock('./LineService', () => ({
  LineService: jest.fn().mockImplementation(() => ({
    pushMessage: pushMessageMock
  }))
}));

describe('NotificationService.sendTaskCreatedNotification', () => {
  let NotificationService: any;
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env.SMTP_USER = 'smtp@example.com';
    process.env.SMTP_PASS = 'password';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    NotificationService = require('./NotificationService').NotificationService;
  });

  it('sends emails to assignee, reviewer and creator', async () => {
    const service = new NotificationService();
    const assignee = { id: '1', email: 'a@example.com', isVerified: true, lineUserId: 'U1', displayName: 'A' };
    const reviewer = { id: '2', email: 'b@example.com', isVerified: true, lineUserId: 'U2', displayName: 'B' };
    const creator = { id: '3', email: 'c@example.com', isVerified: true, lineUserId: 'U3', displayName: 'C' };
    const task = {
      id: 'task1',
      title: 'Test',
      dueTime: new Date().toISOString(),
      group: { lineGroupId: 'G1', name: 'G' },
      assignedUsers: [assignee],
      createdByUser: creator,
      reviewerUser: reviewer
    } as any;

    await service.sendTaskCreatedNotification(task);

    expect(sendMailMock).toHaveBeenCalledTimes(3);
    const recipients = sendMailMock.mock.calls.map(c => c[0].to).sort();
    expect(recipients).toEqual(['a@example.com', 'b@example.com', 'c@example.com']);
  });

  it('avoids duplicate emails when user has multiple roles', async () => {
    const service = new NotificationService();
    const user = { id: '1', email: 'a@example.com', isVerified: true, lineUserId: 'U1', displayName: 'A' };
    const creator = { id: '2', email: 'c@example.com', isVerified: true, lineUserId: 'U3', displayName: 'C' };
    const task = {
      id: 'task2',
      title: 'Test',
      dueTime: new Date().toISOString(),
      group: { lineGroupId: 'G1', name: 'G' },
      assignedUsers: [user],
      createdByUser: creator,
      reviewerUser: user
    } as any;

    await service.sendTaskCreatedNotification(task);

    expect(sendMailMock).toHaveBeenCalledTimes(2);
    const recipients = sendMailMock.mock.calls.map(c => c[0].to).sort();
    expect(recipients).toEqual(['a@example.com', 'c@example.com']);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
});

describe('EmailService duplicate handling', () => {
  let EmailService: any;
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.SMTP_USER = 'smtp@example.com';
    process.env.SMTP_PASS = 'password';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    EmailService = require('./EmailService').EmailService;
  });

  it('sends task created email only once per user-task pair', async () => {
    const emailService = new EmailService();
    const user = { id: '1', email: 'dup@example.com', isVerified: true } as any;
    const task = { id: 't1', dueTime: new Date().toISOString(), group: { lineGroupId: 'G', name: 'G' } } as any;
    await emailService.sendTaskCreatedNotification(user, task);
    await emailService.sendTaskCreatedNotification(user, task);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });
});
