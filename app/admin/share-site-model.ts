type ShareTarget = { subdomain: string; url: string };

type ShareDependencies = {
  copy(url: string): Promise<void>;
  record(subdomain: string): Promise<unknown>;
  recorded(): void;
  recordFailed(error: unknown): void;
};

export async function copySiteForSharing(target: ShareTarget, dependencies: ShareDependencies) {
  await dependencies.copy(target.url);
  void dependencies.record(target.subdomain)
    .then(() => dependencies.recorded())
    .catch((error) => dependencies.recordFailed(error));
  return 'copied' as const;
}
