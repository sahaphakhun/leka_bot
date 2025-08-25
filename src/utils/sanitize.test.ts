import { sanitize } from '@/utils';

describe('sanitize', () => {
  it('removes quotes and CRLF characters', () => {
    const input = 'bad"\r\nname.pdf';
    expect(sanitize(input)).toBe('badname.pdf');
  });
});
