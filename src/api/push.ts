import { api } from './api';

export async function getPushKey(): Promise<string | null> {
  const { data } = await api.get<{ public_key: string | null }>('/push/public-key');
  return data.public_key;
}

export async function subscribeToQuery(
  queryId: string,
  subscription: PushSubscription,
  signal: AbortSignal,
) {
  await api.post(
    `/queries/${encodeURIComponent(queryId)}/push-subscription`,
    subscription.toJSON(),
    { signal },
  );
}
