import * as Sentry from "@sentry/react-native";

export const measure = async <T>(name: string, fn: () => Promise<T>) => {
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - start;
    Sentry.addBreadcrumb({
      category: "perf",
      message: name,
      data: { ms },
      level: "info",
    });
    return result;
  } catch (error) {
    const ms = Date.now() - start;
    Sentry.addBreadcrumb({
      category: "perf",
      message: `${name} failed`,
      data: { ms },
      level: "error",
    });
    throw error;
  }
};
