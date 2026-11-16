import React, { lazy, Suspense } from "react";
import { Loading } from "./Feedback";
const Graph = lazy(() => import("../Chart"));
export function Chart(props) {
  return (
    <Suspense fallback={<Loading />}>
      <Graph {...props} />
    </Suspense>
  );
}
