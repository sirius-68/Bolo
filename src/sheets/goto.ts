/* Opens the screen a notification is about (from the inbox, or from a phone pop-up). */
import { router } from 'expo-router';
import { toast } from '../ui/overlay';
import { db } from '../data/db';
import { curBiz, isW, postById } from '../logic/core';
import { openBizSetup, openBoloMessage, switchToBiz } from './account';
import { openMe, openProfile, openScreen, openTrack } from '../logic/nav';
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
    case 'mentor':
      return openMentor(g.id);
    case 'chat':
      return openChat(g.id);
    case 'profile':
      return openProfile(g.id);
    case 'track':
      return openTrack(g.id);
    case 'post':
      // from a like or a reply: straight to that comment
      return openComments(g.id, g.c);
    case 'teach':
      return openScreen('/teach');
    case 'courses':
      return openScreen('/courses?tab=saved');
    case 'cv':
      return openCV();
    case 'expert':
      return openScreen(`/expert/${g.id}`);
    case 'experts':
      return openScreen('/experts');
    case 'notifs':
      // a message from the bolo team: read it in full (on the Notifications page, opened once)
      openScreen('/notifs');
      if (g.id) {
        const n = [...db.NOTIFS_W, ...db.NOTIFS_C].find((x) => x.id === g.id);
        if (n) setTimeout(() => openBoloMessage(n), 350);
      }
      return;
    case 'verify': {
      // from the bolo team: "please verify" or the answer to a verification
      if (g.id === 'expert') return openScreen('/experts');
      if (g.id === 'business') {
        const b = db.BIZ.list.find((x) => x.remoteId === g.biz) || curBiz();
        if (!b) return openMe();
        if (b.verified === 'verified') return isW() ? switchToBiz(b.id) : openMe();
        // the business page's own set-up, on the step with the RCCM and NIU
        if (isW() || db.BIZ.active !== b.id) {
          switchToBiz(b.id);
          return void setTimeout(() => openBizSetup('edit', 3), 900);
        }
        return openBizSetup('edit', 3);
      }
      return db.PR.docs.id === 'verified' ? openMe() : openScreen('/id-verify');
    }
    case 'me':
      // with a tab name: straight to that part of my profile (Reviews, Posts…)
      return openMe(g.id);
    default:
      return openMe();
  }
}
