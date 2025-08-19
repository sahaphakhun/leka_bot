import { GoogleCalendarService } from './GoogleCalendarService';
import { Task } from '@/types';

jest.mock('googleapis', () => ({
  google: {
    calendar: jest.fn().mockReturnValue({}),
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({})),
      GoogleAuth: jest.fn().mockImplementation(() => ({})),
    },
  },
}));

describe('GoogleCalendarService.getTaskAttendees', () => {
  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = 'id';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost';
  });

  it('returns only verified emails for interface tasks', async () => {
    const mockUserService = {
      findById: jest.fn((id: string) => {
        if (id === '1') {
          return Promise.resolve({ id: '1', email: 'a@example.com', isVerified: true, displayName: 'User A' });
        }
        if (id === '2') {
          return Promise.resolve({ id: '2', email: 'b@example.com', isVerified: false, displayName: 'User B' });
        }
        return Promise.resolve(null);
      }),
    } as any;

    const service = new GoogleCalendarService(mockUserService);
    const task = { assignees: ['1', '2'] } as Task;
    const attendees = await (service as any).getTaskAttendees(task);

    expect(attendees).toEqual([
      { email: 'a@example.com', displayName: 'User A' },
    ]);
    expect(mockUserService.findById).toHaveBeenCalledTimes(2);
  });

  it('returns verified emails for entity tasks', async () => {
    const mockUserService = {
      findById: jest.fn((id: string) => {
        const users: Record<string, any> = {
          '1': { id: '1', email: 'a@example.com', isVerified: true, displayName: 'User A' },
          '2': { id: '2', email: 'b@example.com', isVerified: true, displayName: 'User B' },
          '3': { id: '3', email: 'c@example.com', isVerified: false, displayName: 'User C' },
        };
        return Promise.resolve(users[id] || null);
      }),
    } as any;

    const service = new GoogleCalendarService(mockUserService);
    const task: any = { assignedUsers: [{ id: '1' }, { id: '2' }, { id: '3' }] };
    const attendees = await (service as any).getTaskAttendees(task);

    expect(attendees).toEqual([
      { email: 'a@example.com', displayName: 'User A' },
      { email: 'b@example.com', displayName: 'User B' },
    ]);
    expect(mockUserService.findById).toHaveBeenCalledTimes(3);
  });
});
