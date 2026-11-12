/* Reporting and blocking, reachable from posts, profiles, chats and course listings. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Btn, Input, OptRow } from '../ui/kit';
import { C } from '../ui/theme';
import { sheet, SheetTitle } from '../ui/overlay';
import { REPORT_REASONS, report } from '../logic/work';

/** Ask why, then send the report to bolo's moderators. */
export function openReport(targetType: 'profile' | 'business' | 'post' | 'comment' | 'job' | 'message' | 'course' | 'expert' | 'opportunity', targetId: string) {
  sheet.show(() => <Report type={targetType} id={targetId} />);
}
function Report({ type, id }: { type: string; id: string }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <SheetTitle sub="Reports are private. The person isn’t told who reported them.">What’s wrong?</SheetTitle>
      {REPORT_REASONS.map(([k, t]) => (
        <OptRow key={k} icon={reason === k ? 'checkc' : 'flag'} bg={reason === k ? C.yellow : C.s2} iconColor={reason === k ? '#000' : C.text} title={t} chev={false} onPress={() => setReason(k)} />
      ))}
      <Input multiline value={details} onChangeText={setDetails} maxLength={1000} placeholder="Anything else we should know? (optional)" />
      <Btn
        variant="yellow"
        title="Send report"
        loading={busy}
        disabled={!reason}
        onPress={async () => {
          setBusy(true);
          await report(type, id, reason, details);
          setBusy(false);
          sheet.close();
        }}
      />
    </View>
  );
}
