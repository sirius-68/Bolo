import React from 'react';
import { Gone } from '../src/g/parts';

/** A link to a page that does not exist. */
export default function NotFound() {
  return <Gone title="This page isn’t here" text="It may have moved or been removed." />;
}
