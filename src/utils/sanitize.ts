/**
 * Sanitize string for safe use in HTTP headers like Content-Disposition.
 * Removes characters that can break headers such as quotes and CRLF.
 */
export const sanitize = (value: string): string => value.replace(/["\r\n]/g, '');

