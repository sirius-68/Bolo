import React from 'react';
import { Missing } from '../src/ui/kit';

/** A link to a page that does not exist (an old link, or a feature that was removed). */
export default function NotFound() {
  return <Missing bar="getit" title="This page isn’t here" text="It may have moved or been removed." />;
}
