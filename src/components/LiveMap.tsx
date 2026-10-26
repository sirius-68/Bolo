import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Post } from '../data/db';
import { catIcon } from '../data/catalog';
import { LngLat, anchor, coordOf } from '../data/geo';
import { hasCoord, locGranted, locate } from '../logic/here';
import { useLive } from '../logic/live';
import { Mapbox } from '../lib/mapbox';
import { Avatar, Txt, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/overlay';
import { C, S } from '../ui/theme';
import { P } from '../logic/core';
import { openProfile } from '../logic/nav';
import { openJob } from '../sheets/work';

const shortBudget = (b?: string) => (b || '').replace('XAF ', '').split(' · ')[0].replace(' / month', '/mo').replace(/ \+ .*/, '+').slice(0, 12);

/** Real Mapbox map of jobs or people near you. `onLock` tells the parent scroll view to stop scrolling while the map is being dragged. */
export function LiveMap({ mode, jobs, people, bottomInset = 64, onLock }: { mode: 'jobs' | 'people'; jobs: Post[]; people: string[]; bottomInset?: number; onLock?: (locked: boolean) => void }) {
  useLive();
  const cam = useRef<any>(null);
  const [locOk, setLocOk] = useState<boolean | null>(null);
  useEffect(() => {
    locGranted().then((g) => {
      setLocOk(g);
      if (g) locate(false);
    });
  }, []);
  const centre = async () => {
    tap();
    const c = await locate(true);
    if (!c) {
      setLocOk(false);
      toast('Allow location in your phone settings to see what’s near you');
      return;
    }
    setLocOk(true);
    cam.current?.setCamera({ centerCoordinate: c, zoomLevel: 14, animationDuration: 800 });
  };
  // Fit the view to the pins once per set of pins / position (not on every re-render, so panning isn't undone).
  const a = anchor();
  const key = mode + ':' + a.map((x) => x.toFixed(3)).join(',') + ':' + (mode === 'jobs' ? jobs.slice(0, 8).map((p) => p.id) : people.slice(0, 10)).join(',');
  const bounds = useMemo(() => {
    const pts: LngLat[] = mode === 'jobs' ? jobs.slice(0, 8).map((po) => coordOf(po.id, po.area)) : people.slice(0, 10).map((id) => coordOf(id, P(id).area));
    if (hasCoord()) pts.push(anchor());
    if (pts.length < 2) return undefined;
    const lngs = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    return { ne: [Math.max(...lngs), Math.max(...lats)], sw: [Math.min(...lngs), Math.min(...lats)], paddingTop: 150, paddingBottom: 70, paddingLeft: 50, paddingRight: 50 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!Mapbox) return null;
  const M = Mapbox;
  return (
    <View style={{ flex: 1 }} onTouchStart={() => onLock?.(true)} onTouchEnd={() => onLock?.(false)} onTouchCancel={() => onLock?.(false)}>
      <M.MapView style={{ flex: 1 }} styleURL={M.StyleURL.Dark} scaleBarEnabled={false} compassEnabled={false} pitchEnabled={false} rotateEnabled={false} logoPosition={{ bottom: bottomInset + 50, left: 12 }} attributionPosition={{ bottom: bottomInset + 50, right: 62 }}>
        <M.Camera ref={cam} bounds={bounds} defaultSettings={{ centerCoordinate: a, zoomLevel: 13.2 }} animationDuration={600} />
        {locOk ? <M.LocationPuck visible pulsing={{ isEnabled: true, color: C.blue }} /> : null}
        {mode === 'jobs'
          ? jobs.slice(0, 8).map((po) => (
              <M.MarkerView key={po.id} coordinate={coordOf(po.id, po.area)} allowOverlap anchor={{ x: 0.5, y: 1 }}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${po.title}, ${po.budget}`} onPress={() => (tap(), openJob(po.id))} style={{ alignItems: 'center' }}>
                  <View style={[S.row, { gap: 4, height: 30, paddingHorizontal: 8, borderRadius: 999, backgroundColor: po.urgent ? C.orange : C.yellow }]}>
                    <Icon name={catIcon(po.cat)} size={14} color="#000" />
                    <Txt s={12} w={8} c="#000" lines={1}>
                      {shortBudget(po.budget)}
                    </Txt>
                  </View>
                </Pressable>
              </M.MarkerView>
            ))
          : people.slice(0, 10).map((id) => {
              const p = P(id);
              return (
                <M.MarkerView key={id} coordinate={coordOf(id, p.area)} allowOverlap anchor={{ x: 0.5, y: 1 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={p.name} onPress={() => (tap(), openProfile(id))} style={{ alignItems: 'center' }}>
                    <Avatar pic={p.pin || p.photo} size={38} ring={C.yellow} />
                    <View style={{ marginTop: 2, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(0,0,0,.8)' }}>
                      <Txt s={10} w={8} lines={1}>
                        {p.short || p.name.split(' ')[0]} {p.rate}★
                      </Txt>
                    </View>
                  </Pressable>
                </M.MarkerView>
              );
            })}
      </M.MapView>
      {locOk === false ? (
        <Pressable testID="map-loc-on" accessibilityRole="button" onPress={centre} style={[S.row, { position: 'absolute', left: 16, right: 70, bottom: bottomInset, minHeight: 42, gap: 8, paddingHorizontal: 14, borderRadius: 21, backgroundColor: C.blue }]}>
          <Icon name="gpsfix" size={16} color="#fff" />
          <Txt s={13} w={8} lines={2} style={{ flex: 1 }}>
            Turn on location to see what’s near you
          </Txt>
        </Pressable>
      ) : null}
      <Pressable accessibilityLabel="Centre on me" onPress={centre} style={{ position: 'absolute', right: 16, bottom: bottomInset, width: 42, height: 42, borderRadius: 21, backgroundColor: C.s1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line }}>
        <Icon name="gpsfix" size={20} color={C.text} />
      </Pressable>
    </View>
  );
}

/** Small route map for job tracking: worker → client, with the worker moving along the line. */
export function RouteMap({ from, to, progress, workerPic, height }: { from: LngLat; to: LngLat; progress: number; workerPic: any; height: number }) {
  if (!Mapbox) return null;
  const M = Mapbox;
  const t = Math.max(0, Math.min(1, progress));
  const cur: LngLat = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
  const line = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [from, to] } };
  const mid: LngLat = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  return (
    <View style={{ height }}>
      <M.MapView style={{ flex: 1 }} styleURL={M.StyleURL.Dark} scaleBarEnabled={false} compassEnabled={false} pitchEnabled={false} rotateEnabled={false} logoPosition={{ bottom: 34, left: 10 }} attributionPosition={{ bottom: 34, right: 10 }}>
        <M.Camera defaultSettings={{ centerCoordinate: mid, zoomLevel: 13.6 }} />
        <M.ShapeSource id="route" shape={line}>
          <M.LineLayer id="routeLine" style={{ lineColor: C.yellow, lineWidth: 4, lineDasharray: [0.5, 2], lineCap: 'round' }} />
        </M.ShapeSource>
        <M.MarkerView coordinate={to} allowOverlap>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.yellow, borderWidth: 3, borderColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="house" size={18} color="#000" />
          </View>
        </M.MarkerView>
        <M.MarkerView coordinate={cur} allowOverlap>
          <Avatar pic={workerPic} size={44} ring={C.blue} />
        </M.MarkerView>
      </M.MapView>
    </View>
  );
}
