// Test helper (S22): the action RTK Query dispatches when a mutation succeeds, built by hand so reducer,
// middleware and listener tests don't need HTTP. The shape was checked against the real actions
// (verification/s22-rtk-query.claims.test.ts: the endpoint matchers accept it).
export function mutationFulfilled<Args, Result>(endpointName: string, originalArgs: Args, payload: Result) {
  return {
    type: 'api/executeMutation/fulfilled' as const,
    payload,
    meta: {
      arg: { type: 'mutation' as const, endpointName, originalArgs, track: true },
      requestId: `test-${endpointName}`,
      requestStatus: 'fulfilled' as const,
      fulfilledTimeStamp: 0,
      baseQueryMeta: undefined,
    },
  };
}
