import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { checkoutApi, ordersApi } from '../api/endpoints.js';
import { getToken } from '../api/client.js';
import { describeError } from '../utils/errors.js';

async function resolveOrder(reference, token, signal) {
  if (!reference) return null;

  // A 24-char hex value is a Mongo order id; anything else is the orderNumber.
  if (/^[a-f0-9]{24}$/i.test(reference)) {
    try {
      const detail = await ordersApi.get(reference, { token, signal });
      return detail.order || detail;
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      // fall through to the order-number lookup
    }
  }

  const list = await ordersApi.list({ limit: 50 }, { token, signal });
  const match = list.find(
    (order) => order.orderNumber === reference || String(order._id) === reference
  );
  if (!match) return null;
  const detail = await ordersApi.get(match._id, { token, signal });
  return detail.order || detail;
}

/**
 * Shared logic for the gateway return pages.
 *
 * IMPORTANT: the frontend never marks an order paid. The hook asks the backend
 * to reconcile with the gateway (`/payments/status/:orderId`) and then reads the
 * authoritative order. Pending orders are polled a few times.
 */
export function useOrderReturn({ poll = true } = {}) {
  const [searchParams] = useSearchParams();
  const token = getToken();
  const reference =
    searchParams.get('orderId') ||
    searchParams.get('id') ||
    searchParams.get('order') ||
    searchParams.get('reference') ||
    searchParams.get('orderNumber') ||
    '';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const orderRef = useRef(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError('');
      try {
        let target = orderRef.current;
        if (!target) {
          if (!reference) {
            if (active) {
              setError('No order reference was supplied in the return link.');
              setLoading(false);
            }
            return;
          }
          target = await resolveOrder(reference, token, controller.signal);
        }
        if (!target) {
          const notFound = new Error('We could not find an order matching this return link.');
          notFound.code = 'ORDER_NOT_FOUND';
          throw notFound;
        }
        if (!active) return;
        orderRef.current = target;
        setOrder(target);
        setVerifying(true);

        const attempts = poll ? 3 : 1;
        for (let index = 0; index < attempts; index += 1) {
          if (controller.signal.aborted) return;

          // Backend reconciliation with the payment gateway. A failure here is
          // non-fatal: we still read the current server-side order state.
          try {
            await checkoutApi.paymentStatus(target._id, { token });
          } catch (reconcileError) {
            if (reconcileError.name === 'AbortError') throw reconcileError;
          }

          const detail = await ordersApi.get(target._id, { token, signal: controller.signal });
          if (!active) return;
          const fresh = detail.order || detail;
          orderRef.current = fresh;
          setOrder(fresh);
          target = fresh;

          if (fresh.status !== 'pending_payment') break;
          if (index < attempts - 1) {
            await new Promise((resolve) => {
              const timer = setTimeout(resolve, 2500);
              controller.signal.addEventListener(
                'abort',
                () => {
                  clearTimeout(timer);
                  resolve();
                },
                { once: true }
              );
            });
          }
        }
      } catch (caught) {
        if (!active || caught.name === 'AbortError') return;
        setError(describeError(caught));
      } finally {
        if (active) {
          setLoading(false);
          setVerifying(false);
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt, reference, token, poll]);

  return {
    order,
    loading,
    verifying,
    error,
    reference,
    refresh: () => setAttempt((value) => value + 1),
  };
}
