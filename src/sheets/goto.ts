/* Opens the screen a notification is about (from the inbox, or from a phone pop-up). */
import { router } from 'expo-router';
import { toast } from '../ui/overlay';
import { postById } from '../logic/core';
import { openMe, openProfile, openTrack } from '../logic/nav';
import { Go } from '../logic/notify';
import { openComments, openJob } from './work';
import { openChat } from './chat';
import { openCV, openCourse, openMentor, openOpp } from './career';

/** Opens the screen a notification is about. */
export function goTo(g: Go) {
  switch (g.k) {
    case 'job':
      return postById(g.id) ? openJob(g.id) : toast('This job is no longer available');
    case 'opp':
      return openOpp(g.id);
    case 'course':
      return openCourse(g.id);
    case 'coursePage':
      return router.push(`/course/${g.id}` as any);
    case 'live':
      return router.push(`/live/${g.id}` as any);
    case 'watch':
      return router.push(`/watch/${g.id}${g.t ? `?t=${g.t}` : ''}` as any);
    case 'mentor':
      return openMentor(g.id);
    case 'chat':
      return openChat(g.id);
    case 'profile':
      return openProfile(g.id);
    case 'track':
      return openTrack(g.id);
    case 'post':
      return openComments(g.id);
    case 'wallet':
      return router.push('/wallet' as any);
    case 'teach':
      return router.push('/teach' as any);
    case 'courses':
      return router.push('/courses?tab=saved' as any);
    case 'cv':
      return openCV();
    case 'expert':
      return router.push(`/expert/${g.id}` as any);
    case 'experts':
      return router.push('/experts' as any);
    case 'notifs':
      return router.push('/notifs' as any);
    default:
      return openMe();
  }
}
