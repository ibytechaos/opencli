import { cli, Strategy } from '../../registry.js';
import { DOUBAO_DOMAIN, sendDoubaoMessage } from './common.js';

export const sendCommand = cli({
  site: 'doubao',
  name: 'send',
  description: 'Send a message to Doubao web chat',
  domain: DOUBAO_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: false,
  args: [{ name: 'text', required: true, positional: true, help: 'Message to send' }],
  columns: ['Status', 'SubmittedBy', 'InjectedText'],
  func: async (page, kwargs) => {
    const text = kwargs.text as string;
    const submittedBy = await sendDoubaoMessage(page, text);

    return [{
      Status: 'Success',
      SubmittedBy: submittedBy,
      InjectedText: text,
    }];
  },
});
