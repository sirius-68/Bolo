import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { db } from '../src/data/db';
import { Btn, Empty, Page, StatusPill, TopBar, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { sheet, SheetTitle, toast } from '../src/ui/overlay';
import { C, S } from '../src/ui/theme';
import { curBiz, isW, xaf } from '../src/logic/core';
import { bump, useLive } from '../src/logic/live';
import { adPct, adRate, adsOf, startAdTicker } from '../src/logic/career';
import { openAdCreate } from '../src/sheets/business';
import { openPro } from '../src/sheets/account';

export default function Ads() {
  useLive();
  if (isW() || !curBiz())
    return (
      <Page header={<TopBar title="Ads manager" />}>
        <Empty title="Ads are for business pages" text="Switch to one of your business pages to promote vacancies, programs and courses." />
      </Page>
    );
  const A = adsOf();
  const act = A.filter((x) => x.status === 'active');
  const sum = (k: 'reached' | 'clicks' | 'apps') => A.reduce((s, x) => s + x[k], 0);
  const spent = Math.round(A.reduce((s, x) => s + (x.paid * adPct(x)) / 100, 0));
  return (
    <Page header={<TopBar title="Ads manager" />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {(
          [
            ['Total reach', sum('reached').toLocaleString('en-US')],
            ['Clicks', sum('clicks').toLocaleString('en-US')],
            ['Applicants', String(sum('apps'))],
            ['Spent', xaf(spent)],
          ] as [string, string][]
        ).map(([l, v]) => (
          <View key={l} style={{ flexBasis: '48%', flexGrow: 1, padding: 14, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
            <Txt s={12} c={C.muted}>
              {l}
            </Txt>
            <Txt s={20} w={8}>
              {v}
            </Txt>
          </View>
        ))}
      </View>
      <Btn variant="yellow" icon="plus" title="Create an ad" style={{ marginTop: 14 }} onPress={openAdCreate} />
      <View style={[S.row, { justifyContent: 'center', gap: 4, marginTop: 8, flexWrap: 'wrap' }]}>
        <Txt s={12} c={C.muted}>
          {xaf(adRate())} per 100 people reached
          {db.user.pro.business ? ' · Business Pro discount applied' : ' ·'}
        </Txt>
        {!db.user.pro.business ? (
          <Pressable onPress={() => openPro('business', 'ads')}>
            <Txt s={12} w={8} c={C.lav}>
              Save 20% with Business Pro
            </Txt>
          </Pressable>
        ) : null}
      </View>
      <View style={[S.rowB, { marginTop: 22, marginBottom: 10 }]}>
        <Txt s={17} w={8}>
          Your ads
        </Txt>
        <Txt s={12} c={C.muted}>
          {act.length} active
        </Txt>
      </View>
      {A.length ? (
        <View style={{ gap: 10 }}>
          {A.map((ad) => (
            <View key={ad.id} style={{ padding: 14, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 8 }}>
              <View style={[S.row, { gap: 10 }]}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={ad.t[0] === 'vac' ? 'job' : ad.t[0] === 'course' ? 'file' : ad.t[0] === 'opp' ? 'cap' : 'storefront'} size={18} color={C.yellow} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt s={14} w={8} lines={1}>
                    {ad.head}
                  </Txt>
                  <Txt s={12} c={C.muted} lines={1}>
                    {ad.t[3]} · {ad.areas.join(', ')} · {ad.days} days
                  </Txt>
                </View>
                <StatusPill kind={ad.status === 'active' ? 'acc' : 'wait'} text={ad.status === 'active' ? 'Active' : ad.status === 'done' ? 'Completed' : 'Paused'} />
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: C.s3, overflow: 'hidden' }}>
                <View style={{ width: `${adPct(ad)}%`, height: 6, backgroundColor: C.yellow }} />
              </View>
              <Txt s={12} c={C.muted}>
                {ad.reached.toLocaleString('en-US')} / {ad.reach.toLocaleString('en-US')} reached · {ad.clicks} clicks · {ad.apps} applicants
              </Txt>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ad.status !== 'done' ? (
                  <Btn
                    small
                    variant="dark"
                    icon={ad.status === 'active' ? 'pause' : 'play'}
                    title={ad.status === 'active' ? 'Pause' : 'Resume'}
                    onPress={() => {
                      ad.status = ad.status === 'active' ? 'paused' : 'active';
                      if (ad.status === 'active') startAdTicker();
                      bump();
                      toast(ad.status === 'active' ? 'Ad resumed' : 'Ad paused');
                    }}
                  />
                ) : null}
                <Btn small variant="dark" icon="rocket" title="Boost reach" onPress={() => openBoostAd(ad.id)} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Empty title="No ads yet" text="Promote a vacancy, program, course or your company page to reach more people." />
      )}
    </Page>
  );
}

function openBoostAd(id: string) {
  sheet.show(() => {
    const B = () => {
      const [n, setN] = useState(1000);
      const [busy, setBusy] = useState(false);
      const ad = adsOf().find((x) => x.id === id)!;
      return (
        <View style={{ gap: 12 }}>
          <SheetTitle sub={`Add more people to this ad. ${xaf(adRate())} per 100 people.`}>Boost “{ad.head}”</SheetTitle>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[500, 1000, 5000].map((v) => (
              <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: n === v }} onPress={() => setN(v)} style={{ flex: 1, padding: 12, borderRadius: 14, alignItems: 'center', backgroundColor: C.s2, borderWidth: 2, borderColor: n === v ? C.yellow : 'transparent' }}>
                <Txt s={15} w={8}>
                  +{v.toLocaleString('en-US')}
                </Txt>
                <Txt s={12} c={C.muted}>
                  {xaf((v / 100) * adRate())}
                </Txt>
              </Pressable>
            ))}
          </View>
          <Btn
            variant="yellow"
            loading={busy}
            title={busy ? 'Waiting for Mobile Money approval…' : `Pay ${xaf((n / 100) * adRate())}`}
            onPress={() => {
              setBusy(true);
              setTimeout(() => {
                ad.reach += n;
                ad.paid += (n / 100) * adRate();
                ad.status = 'active';
                startAdTicker();
                sheet.close('🚀 Reach boosted by ' + n.toLocaleString('en-US'));
              }, 1200);
            }}
          />
        </View>
      );
    };
    return <B />;
  });
}
