import { LineService } from './LineService';
import { Client, FlexMessage } from '@line/bot-sdk';

jest.mock('@line/bot-sdk');

const mockReply = jest.fn().mockResolvedValue(undefined);
(Client as unknown as jest.Mock).mockImplementation(() => ({
  replyMessage: mockReply,
}));

describe('LineService.replyMessage', () => {
  beforeAll(() => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'token';
    process.env.LINE_CHANNEL_SECRET = 'secret';
  });

  beforeEach(() => {
    mockReply.mockClear();
  });

  it('sends single text message', async () => {
    const service = new LineService();
    await service.replyMessage('replyToken', 'hello');
    expect(mockReply).toHaveBeenCalledWith('replyToken', {
      type: 'text',
      text: 'hello',
    });
  });

  it('sends multiple messages', async () => {
    const service = new LineService();
    const flex: FlexMessage = {
      type: 'flex',
      altText: 'alt',
      contents: { type: 'bubble' } as any,
    };

    await service.replyMessage('token', ['hi', flex]);
    expect(mockReply).toHaveBeenCalledWith('token', [
      { type: 'text', text: 'hi' },
      flex,
    ]);
  });
});
