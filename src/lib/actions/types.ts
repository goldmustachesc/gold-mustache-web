export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

export function actionSuccess(): ActionResult<void>;
export function actionSuccess<T>(data: T): ActionResult<T>;
export function actionSuccess<T>(data?: T): ActionResult<T> {
  return { success: true, data: data as T };
}

export function actionError(
  code: string,
  message: string,
): ActionResult<never> {
  return { success: false, error: message, code };
}
