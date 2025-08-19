import { GoogleService } from './GoogleService';
import { GoogleCalendarService } from './GoogleCalendarService';
import { UserService } from './UserService';

jest.mock('./GoogleCalendarService');
jest.mock('./UserService');

describe('GoogleService.shareCalendarWithMembers', () => {
  it('shares calendar with all specified participants', async () => {
    const mockCalendarService = {
      shareCalendarWithUser: jest.fn().mockResolvedValue(undefined)
    } as unknown as GoogleCalendarService;

    const mockUserService = {
      findGroupById: jest.fn().mockResolvedValue({
        id: 'g1',
        settings: { googleCalendarId: 'cal-1' }
      }),
      getGroupMembers: jest.fn().mockResolvedValue([
        { id: 'u1', email: 'u1@example.com', isVerified: true, role: 'member' },
        { id: 'u2', email: 'u2@example.com', isVerified: true, role: 'admin' },
        { id: 'u3', email: 'u3@example.com', isVerified: true, role: 'member' }
      ])
    } as unknown as UserService;

    (GoogleCalendarService as unknown as jest.Mock).mockImplementation(() => mockCalendarService);
    (UserService as unknown as jest.Mock).mockImplementation(() => mockUserService);

    const service = new GoogleService();
    await service.shareCalendarWithMembers('g1', ['u1', 'u2']);

    expect(mockCalendarService.shareCalendarWithUser).toHaveBeenCalledTimes(2);
    expect(mockCalendarService.shareCalendarWithUser).toHaveBeenCalledWith('cal-1', 'u1@example.com', 'reader');
    expect(mockCalendarService.shareCalendarWithUser).toHaveBeenCalledWith('cal-1', 'u2@example.com', 'writer');
  });
});

