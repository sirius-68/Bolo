/* Opens the screen a notification is about (from Inbox → Updates, or from a pop-up on the phone). */
import { router } from 'expo-router';
import { db } from '../data/db';
import { postById } from '../logic/core';
import type { Go } from '../logic/notify';
import { bk } from '../logic/work';
import { openChat, openRequestOf } from './nav';
import { toast } from './notice';
import { working } from './data';

export function goTo(g: Go) {
  switch (g.k) {
    case 'job':
      return postById(g.id) ? openRequestOf(g.id) : toast('This job is no longer open');
    case 'chat':
      return openChat(g.id);
    case 'profile':
      return router.push(`/profile/${g.id}` as any);
    case 'track': {
      const b = bk(g.id);
      // the worker's first look at a new booking is the "booked you" screen
      return router.push((b && b.worker === 'me' && b.state === 'booked' ? `/wbooked?b=${g.id}` : `/track/${g.id}`) as any);
    }
    case 'verify':
      return router.push('/wid' as any);
    case 'me':
      return db.loggedIn && working() ? router.push('/wprofile' as any) : router.navigate('/inbox' as any);
    default:
      return router.navigate('/inbox' as any);
  }
}
